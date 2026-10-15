import React, { useState } from 'react';
import { AdminLayout } from '../components/layout/AdminLayout';
import { useListProducts, useCreateProduct, useUpdateProduct, useDeleteProduct, getListProductsQueryKey, useListCategories } from '@workspace/api-client-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { useQueryClient } from '@tanstack/react-query';
import { Trash2, Edit2, Plus, X, Copy, Image as ImageIcon } from 'lucide-react';
import { ImageUpload } from '../components/admin/ImageUpload';
import { OptionsEditor } from '../components/admin/OptionsEditor';

const apiError = (e: unknown, fallback: string) => (e as { data?: { error?: string } })?.data?.error ?? fallback;
import { formatPrice } from '../lib/utils';

export default function AdminProducts() {
  const { data: products, isLoading } = useListProducts({ includeInactive: true });
  const { data: categories } = useListCategories();
  const queryClient = useQueryClient();
  
  const createProd = useCreateProduct();
  const updateProd = useUpdateProduct();
  const deleteProd = useDeleteProduct();

  const [editingId, setEditingId] = useState<number | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState<any>({});

  const defaultForm = {
    categoryId: '',
    name: '',
    description: '',
    sku: '',
    price: 0,
    oldPrice: '',
    imageUrl: '',
    stock: 0,
    isActive: true,
    isFeatured: false,
    sizes: [],
    colors: []
  };

  const resetForm = () => {
    setEditingId(null);
    setIsCreating(false);
    setFormData(defaultForm);
  };

  const handleEdit = (prod: any) => {
    setEditingId(prod.id);
    setIsCreating(false);
    setFormData({
      ...prod,
      categoryId: prod.categoryId.toString(),
      oldPrice: prod.oldPrice || '',
      description: prod.description || '',
      sku: prod.sku || '',
      imageUrl: prod.imageUrl || ''
    });
  };

  // Opens the create form prefilled from an existing product (e.g. the same box in another size).
  const handleDuplicate = (prod: any) => {
    handleEdit(prod);
    setEditingId(null);
    setIsCreating(true);
    setFormData((f: any) => ({ ...f, name: `${prod.name} (копія)`, sku: '' }));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSave = async () => {
    try {
      const payload = {
        ...formData,
        categoryId: parseInt(formData.categoryId),
        price: Number(formData.price),
        oldPrice: formData.oldPrice ? Number(formData.oldPrice) : null,
        stock: Number(formData.stock),
        sizes: formData.sizes.filter((o: any) => o.name.trim()),
        colors: formData.colors.filter((o: any) => o.name.trim())
      };

      if (isCreating) {
        await createProd.mutateAsync({ data: payload });
      } else if (editingId) {
        await updateProd.mutateAsync({ id: editingId, data: payload });
      }
      queryClient.invalidateQueries({ queryKey: getListProductsQueryKey() });
      resetForm();
    } catch (e) {
      console.error(e);
      alert(apiError(e, 'Помилка збереження'));
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Видалити товар? У старих замовленнях він залишиться під своєю назвою.')) return;
    try {
      await deleteProd.mutateAsync({ id });
      queryClient.invalidateQueries({ queryKey: getListProductsQueryKey() });
    } catch (e) {
      console.error(e);
      alert(apiError(e, 'Помилка видалення'));
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6 pb-20">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold text-white">Товари</h1>
          {!isCreating && !editingId && (
            <Button onClick={() => { setIsCreating(true); setFormData(defaultForm); }} className="rounded-xl">
              <Plus className="w-4 h-4 mr-2" /> Додати товар
            </Button>
          )}
        </div>

        {(isCreating || editingId) && (
          <div className="glass-panel p-6 rounded-3xl space-y-6">
            <div className="flex justify-between items-center border-b border-white/10 pb-4">
              <h2 className="text-xl font-semibold text-white">
                {isCreating ? 'Новий товар' : 'Редагування товару'}
              </h2>
              <button onClick={resetForm} className="text-white/50 hover:text-white p-2">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-sm text-white/60">Назва</label>
                  <Input 
                    value={formData.name}
                    onChange={e => setFormData({...formData, name: e.target.value})}
                  />
                </div>
                
                <div className="space-y-1">
                  <label className="text-sm text-white/60">Категорія</label>
                  <Select value={formData.categoryId} onValueChange={v => setFormData({...formData, categoryId: v})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Оберіть категорію" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories?.map(cat => (
                        <SelectItem key={cat.id} value={cat.id.toString()}>{cat.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-sm text-white/60">Ціна (грн)</label>
                    <Input 
                      type="number"
                      value={formData.price}
                      onChange={e => setFormData({...formData, price: e.target.value})}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm text-white/60">Стара ціна (грн)</label>
                    <Input 
                      type="number"
                      value={formData.oldPrice}
                      onChange={e => setFormData({...formData, oldPrice: e.target.value})}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-sm text-white/60">Залишок</label>
                    <Input 
                      type="number"
                      value={formData.stock}
                      onChange={e => setFormData({...formData, stock: e.target.value})}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm text-white/60">Артикул (SKU)</label>
                    <Input 
                      value={formData.sku}
                      onChange={e => setFormData({...formData, sku: e.target.value})}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-sm text-white/60">Зображення</label>
                  <ImageUpload value={formData.imageUrl} onChange={url => setFormData({...formData, imageUrl: url})} />
                </div>

                <div className="space-y-1">
                  <label className="text-sm text-white/60">Опис</label>
                  <Textarea 
                    value={formData.description}
                    onChange={e => setFormData({...formData, description: e.target.value})}
                    className="h-32"
                  />
                </div>

                <div className="flex gap-6 pt-2">
                  <label className="flex items-center gap-2 text-white cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={formData.isActive}
                      onChange={e => setFormData({...formData, isActive: e.target.checked})}
                      className="w-4 h-4 rounded border-white/20 bg-white/5 text-primary accent-primary"
                    />
                    Активний
                  </label>
                  <label className="flex items-center gap-2 text-white cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={formData.isFeatured}
                      onChange={e => setFormData({...formData, isFeatured: e.target.checked})}
                      className="w-4 h-4 rounded border-white/20 bg-white/5 text-primary accent-primary"
                    />
                    Рекомендований
                  </label>
                </div>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6 pt-4 border-t border-white/10">
              <OptionsEditor
                label="Розміри"
                placeholder="Напр. 10×10×5 см"
                value={formData.sizes ?? []}
                onChange={sizes => setFormData({...formData, sizes})}
              />
              <OptionsEditor
                label="Кольори"
                placeholder="Напр. Пудровий"
                withColor
                value={formData.colors ?? []}
                onChange={colors => setFormData({...formData, colors})}
              />
              <p className="md:col-span-2 text-xs text-white/40">
                Ціна для покупця = базова ціна + надбавка обраного розміру + надбавка обраного кольору. Залишок спільний для всіх варіантів.
              </p>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
              <Button variant="ghost" onClick={resetForm}>Скасувати</Button>
              <Button 
                onClick={handleSave}
                disabled={!formData.name || !formData.categoryId || createProd.isPending || updateProd.isPending}
              >
                Зберегти
              </Button>
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="py-10 text-center text-white/50">Завантаження...</div>
        ) : (
          <div className="grid gap-4">
            {products?.map(prod => (
              <div key={prod.id} className={`glass-panel p-4 rounded-2xl flex gap-4 items-center ${!prod.isActive ? 'opacity-60' : ''}`}>
                <div className="w-16 h-16 rounded-xl bg-white/10 overflow-hidden shrink-0 flex items-center justify-center">
                  {prod.imageUrl ? (
                    <img src={prod.imageUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <ImageIcon className="w-6 h-6 text-white/30" />
                  )}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-white font-medium truncate">{prod.name}</h3>
                    {prod.isFeatured && <span className="bg-primary/20 text-primary text-[10px] px-2 py-0.5 rounded-full font-bold">Хіт</span>}
                    {!prod.isActive && <span className="bg-white/10 text-white/50 text-[10px] px-2 py-0.5 rounded-full">Неактивний</span>}
                  </div>
                  <div className="flex items-center gap-4 text-sm">
                    <span className="text-primary font-bold">{formatPrice(prod.price)}</span>
                    <span className="text-white/50">Залишок: {prod.stock}</span>
                    {(prod.sizes.length > 0 || prod.colors.length > 0) && (
                      <span className="text-white/40 hidden sm:inline">
                        {[prod.sizes.length && `${prod.sizes.length} розм.`, prod.colors.length && `${prod.colors.length} кол.`].filter(Boolean).join(' · ')}
                      </span>
                    )}
                    <span className="text-white/30 truncate hidden sm:inline">{categories?.find(c => c.id === prod.categoryId)?.name}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Button variant="ghost" size="icon" title="Дублювати" onClick={() => handleDuplicate(prod)}>
                    <Copy className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="icon" title="Редагувати" onClick={() => handleEdit(prod)}>
                    <Edit2 className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => handleDelete(prod.id)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
            {products?.length === 0 && (
              <div className="glass-panel p-12 text-center text-white/50 rounded-3xl">
                Немає товарів
              </div>
            )}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
