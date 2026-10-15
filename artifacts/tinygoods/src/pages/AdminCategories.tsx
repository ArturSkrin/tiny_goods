import React, { useState } from 'react';
import { AdminLayout } from '../components/layout/AdminLayout';
import { useListCategories, useCreateCategory, useUpdateCategory, useDeleteCategory, getListCategoriesQueryKey } from '@workspace/api-client-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { useQueryClient } from '@tanstack/react-query';
import { Trash2, Edit2, Plus, X } from 'lucide-react';

export default function AdminCategories() {
  const { data: categories, isLoading } = useListCategories();
  const queryClient = useQueryClient();
  
  const createCat = useCreateCategory();
  const updateCat = useUpdateCategory();
  const deleteCat = useDeleteCategory();

  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({ name: '', slug: '', sortOrder: 0 });
  const [isCreating, setIsCreating] = useState(false);

  const resetForm = () => {
    setEditingId(null);
    setIsCreating(false);
    setFormData({ name: '', slug: '', sortOrder: 0 });
  };

  const handleEdit = (cat: any) => {
    setEditingId(cat.id);
    setIsCreating(false);
    setFormData({ name: cat.name, slug: cat.slug, sortOrder: cat.sortOrder });
  };

  const handleSave = async () => {
    try {
      if (isCreating) {
        await createCat.mutateAsync({ data: formData });
      } else if (editingId) {
        await updateCat.mutateAsync({ id: editingId, data: formData });
      }
      queryClient.invalidateQueries({ queryKey: getListCategoriesQueryKey() });
      resetForm();
    } catch (e) {
      console.error(e);
      alert((e as { data?: { error?: string } })?.data?.error ?? 'Помилка збереження');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Видалити категорію?')) return;
    try {
      await deleteCat.mutateAsync({ id });
      queryClient.invalidateQueries({ queryKey: getListCategoriesQueryKey() });
    } catch (e) {
      console.error(e);
      alert((e as { data?: { error?: string } })?.data?.error ?? 'Помилка видалення');
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold text-white">Категорії</h1>
          {!isCreating && !editingId && (
            <Button onClick={() => setIsCreating(true)} className="rounded-xl">
              <Plus className="w-4 h-4 mr-2" /> Додати категорію
            </Button>
          )}
        </div>

        {(isCreating || editingId) && (
          <div className="glass-panel p-6 rounded-3xl space-y-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-white">
                {isCreating ? 'Нова категорія' : 'Редагування категорії'}
              </h2>
              <button onClick={resetForm} className="text-white/50 hover:text-white p-2">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="grid md:grid-cols-3 gap-4">
              <div className="space-y-1">
                <label className="text-sm text-white/60">Назва</label>
                <Input 
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                  placeholder="Гаджети"
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm text-white/60">Slug (URL)</label>
                <Input 
                  value={formData.slug}
                  onChange={e => setFormData({...formData, slug: e.target.value})}
                  placeholder="gadgets"
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm text-white/60">Сортування</label>
                <Input 
                  type="number"
                  value={formData.sortOrder}
                  onChange={e => setFormData({...formData, sortOrder: parseInt(e.target.value) || 0})}
                />
              </div>
            </div>
            
            <div className="flex justify-end gap-3 pt-4">
              <Button variant="ghost" onClick={resetForm}>Скасувати</Button>
              <Button 
                onClick={handleSave}
                disabled={!formData.name || !formData.slug || createCat.isPending || updateCat.isPending}
              >
                Зберегти
              </Button>
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="py-10 text-center text-white/50">Завантаження...</div>
        ) : (
          <div className="glass-panel rounded-3xl overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/10 bg-white/5">
                  <th className="p-4 text-white/60 font-medium">Назва</th>
                  <th className="p-4 text-white/60 font-medium">Slug</th>
                  <th className="p-4 text-white/60 font-medium text-center">Товарів</th>
                  <th className="p-4 text-white/60 font-medium text-right">Дії</th>
                </tr>
              </thead>
              <tbody>
                {categories?.map(cat => (
                  <tr key={cat.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                    <td className="p-4 text-white font-medium">{cat.name}</td>
                    <td className="p-4 text-white/60">{cat.slug}</td>
                    <td className="p-4 text-white/60 text-center">{cat.productCount}</td>
                    <td className="p-4 text-right space-x-2">
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(cat)}>
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => handleDelete(cat.id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
                {categories?.length === 0 && (
                  <tr>
                    <td colSpan={4} className="p-8 text-center text-white/50">Немає категорій</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
