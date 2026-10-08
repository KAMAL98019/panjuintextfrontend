import React from 'react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { Label, Input, Select, Textarea, ErrorText } from '../../components/form/Field';
import Button from '../../components/Button';
import * as productsApi from '../../api/products';

const CATEGORIES = ['MosquitoNet', 'Curtains', 'Wallpaper', 'WallSticker', 'Blinds', 'Accessories', 'Installation', 'Other'];

export default function ProductForm({ initialValues, onSuccess }) {
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
    defaultValues: initialValues || {
      name: '', category: 'MosquitoNet', unit: 'sqft', hsnCode: '', gstPercent: 18, defaultRate: '',
      description: '', status: 'Active',
    },
  });

  const onSubmit = async (values) => {
    const payload = { ...values, gstPercent: Number(values.gstPercent), defaultRate: Number(values.defaultRate) };
    try {
      if (initialValues) {
        await productsApi.updateProduct(initialValues.id, payload);
        toast.success('Product updated');
      } else {
        await productsApi.createProduct(payload);
        toast.success('Product created');
      }
      onSuccess();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Something went wrong');
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <Label>Product Name</Label>
        <Input {...register('name', { required: 'Product name is required' })} placeholder="e.g. Zebra Blinds - Grey" />
        <ErrorText>{errors.name}</ErrorText>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Category</Label>
          <Select {...register('category', { required: true })}>
            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </Select>
        </div>
        <div>
          <Label>Unit</Label>
          <Input {...register('unit', { required: 'Unit is required' })} placeholder="sqft / pc / mtr" />
          <ErrorText>{errors.unit}</ErrorText>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <Label>HSN Code</Label>
          <Input {...register('hsnCode')} placeholder="e.g. 6303" />
        </div>
        <div>
          <Label>GST %</Label>
          <Input type="number" step="0.01" {...register('gstPercent', { required: true, min: 0, max: 100 })} />
          <ErrorText>{errors.gstPercent}</ErrorText>
        </div>
        <div>
          <Label>Default Rate</Label>
          <Input type="number" step="0.01" {...register('defaultRate', { min: 0 })} />
          <ErrorText>{errors.defaultRate}</ErrorText>
        </div>
      </div>

      <div>
        <Label>Description</Label>
        <Textarea rows={2} {...register('description')} />
      </div>

      <div>
        <Label>Status</Label>
        <Select {...register('status')}>
          <option value="Active">Active</option>
          <option value="Inactive">Inactive</option>
        </Select>
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button type="submit" variant="accent" disabled={isSubmitting}>
          {isSubmitting ? 'Saving...' : 'Save Product'}
        </Button>
      </div>
    </form>
  );
}
