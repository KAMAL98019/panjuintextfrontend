import React from 'react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { Label, Input, Select, Textarea, ErrorText } from '../../components/form/Field';
import Button from '../../components/Button';
import * as customersApi from '../../api/customers';

export default function CustomerForm({ initialValues, onSuccess }) {
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
    defaultValues: initialValues || {
      name: '', mobile: '', altMobile: '', email: '', address: '', city: '', state: '', pincode: '',
      gstNumber: '', customerType: 'Individual',
    },
  });

  const onSubmit = async (values) => {
    try {
      if (initialValues) {
        await customersApi.updateCustomer(initialValues.id, values);
        toast.success('Customer updated');
      } else {
        await customersApi.createCustomer(values);
        toast.success('Customer created');
      }
      onSuccess();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Something went wrong');
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <Label>Full Name</Label>
        <Input {...register('name', { required: 'Name is required' })} placeholder="Enter client name" />
        <ErrorText>{errors.name}</ErrorText>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Mobile Number</Label>
          <Input {...register('mobile', { required: 'Mobile is required' })} placeholder="+91 00000 00000" />
          <ErrorText>{errors.mobile}</ErrorText>
        </div>
        <div>
          <Label>Alternate Number</Label>
          <Input {...register('altMobile')} placeholder="Optional" />
        </div>
      </div>

      <div>
        <Label>Email (Optional)</Label>
        <Input type="email" {...register('email')} placeholder="client@example.com" />
        <ErrorText>{errors.email}</ErrorText>
      </div>

      <div>
        <Label>Address</Label>
        <Textarea rows={2} {...register('address', { required: 'Address is required' })} placeholder="Suite, Street, Landmark..." />
        <ErrorText>{errors.address}</ErrorText>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <Label>City (Optional)</Label>
          <Input {...register('city')} placeholder="Optional" />
        </div>
        <div>
          <Label>State (Optional)</Label>
          <Input {...register('state')} placeholder="Optional" />
        </div>
        <div>
          <Label>Pincode (Optional)</Label>
          <Input {...register('pincode')} placeholder="Optional" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>GST Number (Optional)</Label>
          <Input {...register('gstNumber')} placeholder="22AAAAA0000A1Z5" />
        </div>
        <div>
          <Label>Customer Type</Label>
          <Select {...register('customerType')}>
            <option value="Individual">Individual</option>
            <option value="Company">Company</option>
          </Select>
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button type="submit" variant="accent" disabled={isSubmitting}>
          {isSubmitting ? 'Saving...' : 'Save Customer'}
        </Button>
      </div>
    </form>
  );
}
