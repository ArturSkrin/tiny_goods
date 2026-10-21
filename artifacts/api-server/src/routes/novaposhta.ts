import { Router, type IRouter } from "express";
import { SearchNpCitiesQueryParams, SearchNpWarehousesQueryParams } from "@workspace/api-zod";
import { np as npCall, cached } from "../lib/novaposhta";

const router: IRouter = Router();

const np = <T>(calledMethod: string, methodProperties: Record<string, string>) =>
  npCall<T>("AddressGeneral", calledMethod, methodProperties);

// Regional centres, biggest first: shown before the buyer types anything.
const MAJOR_CITIES = [
  "Київ", "Харків", "Одеса", "Дніпро", "Львів", "Запоріжжя", "Вінниця", "Полтава",
  "Чернігів", "Черкаси", "Хмельницький", "Житомир", "Суми", "Рівне", "Івано-Франківськ",
  "Тернопіль", "Луцьк", "Чернівці", "Миколаїв", "Кропивницький", "Ужгород", "Херсон",
];

type NpCityRow = { Ref: string; Description: string; AreaDescription: string; SettlementTypeDescription: string };
type NpWarehouseRow = { Ref: string; Number: string; Description: string };

const toCity = (c: NpCityRow) => ({ ref: c.Ref, name: c.Description, area: c.AreaDescription });

router.get("/np/cities", async (req, res): Promise<void> => {
  const parsed = SearchNpCitiesQueryParams.safeParse(req.query);
  const q = parsed.success ? (parsed.data.q ?? "").trim() : "";
  try {
    if (!q) {
      const cities = await cached("major", 24 * 3600_000, async () => {
        const found = await Promise.all(
          MAJOR_CITIES.map(async (name) => {
            const rows = await np<NpCityRow>("getCities", { FindByString: name, Limit: "10" });
            const exact = rows.find((r) => r.Description === name && r.SettlementTypeDescription === "місто") ?? rows.find((r) => r.Description === name);
            return exact ? toCity(exact) : null;
          }),
        );
        return found.filter((c): c is NonNullable<typeof c> => c !== null);
      });
      res.json(cities);
      return;
    }
    const rows = await cached(`city:${q.toLowerCase()}`, 3600_000, () =>
      np<NpCityRow>("getCities", { FindByString: q, Limit: "20" }),
    );
    // Cities before villages; otherwise keep NP's order.
    const rank = (r: NpCityRow) => (r.SettlementTypeDescription === "місто" ? 0 : 1);
    res.json([...rows].sort((a, b) => rank(a) - rank(b)).map(toCity));
  } catch (err) {
    req.log.warn({ err }, "Nova Poshta cities lookup failed");
    res.status(502).json({ error: "Не вдалося завантажити міста Нової Пошти" });
  }
});

router.get("/np/warehouses", async (req, res): Promise<void> => {
  const parsed = SearchNpWarehousesQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: "cityRef is required" });
    return;
  }
  const { cityRef } = parsed.data;
  const q = (parsed.data.q ?? "").trim();
  try {
    const rows = await cached(`wh:${cityRef}:${q.toLowerCase()}`, 3600_000, () =>
      np<NpWarehouseRow>("getWarehouses", { CityRef: cityRef, FindByString: q, Limit: "50", Page: "1" }),
    );
    res.json(rows.map((w) => ({ ref: w.Ref, number: w.Number, name: w.Description })));
  } catch (err) {
    req.log.warn({ err }, "Nova Poshta warehouses lookup failed");
    res.status(502).json({ error: "Не вдалося завантажити відділення Нової Пошти" });
  }
});

export default router;
