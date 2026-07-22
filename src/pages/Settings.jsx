import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import Layout from '../components/Layout';
import Button from '../components/Button';
import { Label, Input } from '../components/form/Field';
import * as settingsApi from '../api/settings';
import * as authApi from '../api/auth';

export default function Settings() {
  const { register, handleSubmit, reset, formState: { isSubmitting } } = useForm();
  const [logoFile, setLogoFile] = useState(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    settingsApi.getSettings().then((res) => {
      reset(res.data.data || {});
      setLoaded(true);
    });
  }, [reset]);

  const onSubmit = async (values) => {
    const formData = new FormData();
    Object.entries(values).forEach(([key, val]) => {
      if (val !== undefined && val !== null) formData.append(key, val);
    });
    if (logoFile) formData.append('logo', logoFile);

    try {
      await settingsApi.updateSettings(formData);
      toast.success('Company settings saved');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save settings');
    }
  };

  return (
    <Layout>
      <div className="mb-6">
        <p className="text-xs text-gray-400 mb-1">Dashboard &gt; Settings</p>
        <h1 className="text-2xl font-bold text-navy-900">Company Configuration</h1>
        <p className="text-sm text-gray-500">Manage your company details, document numbering and account security.</p>
      </div>

      {loaded && (
        <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <section className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
            <h3 className="font-bold text-navy-900">Company Details</h3>
            <div>
              <Label>Registered Company Name</Label>
              <Input {...register('name', { required: true })} />
            </div>
            <div>
              <Label>Registered Address</Label>
              <Input {...register('address', { required: true })} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label>Primary Contact Email</Label>
                <Input type="email" {...register('email', { required: true })} />
              </div>
              <div>
                <Label>Phone</Label>
                <Input {...register('phone', { required: true })} />
              </div>
            </div>
            <div>
              <Label>State (used for GST inter/intra-state calculation)</Label>
              <Input {...register('state', { required: true })} />
            </div>
            <div>
              <Label>Owner WhatsApp Number (documents are sent here)</Label>
              <Input {...register('ownerWhatsapp')} placeholder="10-digit mobile with WhatsApp, e.g. 9443216416" />
            </div>
            <div>
              <Label>Company Logo</Label>
              <input type="file" accept="image/*" onChange={(e) => setLogoFile(e.target.files?.[0] || null)} className="text-sm" />
            </div>
          </section>

          <section className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
            <h3 className="font-bold text-navy-900">Document Number Prefixes</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label>Quotation Prefix</Label>
                <Input {...register('quotationPrefix')} />
              </div>
              <div>
                <Label>Order Prefix</Label>
                <Input {...register('orderPrefix')} />
              </div>
              <div>
                <Label>Invoice Prefix</Label>
                <Input {...register('invoicePrefix')} />
              </div>
              <div>
                <Label>Memo Prefix</Label>
                <Input {...register('memoPrefix')} />
              </div>
              <div>
                <Label>Customer Prefix</Label>
                <Input {...register('customerPrefix')} />
              </div>
              <div>
                <Label>Next Quotation Number</Label>
                <Input type="number" min="1" {...register('nextQuotationNumber')} placeholder="e.g. 131" />
                <p className="text-[11px] text-gray-400 mt-1">The next quotation will be issued as {'{Prefix}'}-{'{this number}'} and continue from there.</p>
              </div>
            </div>

            <Button type="submit" variant="accent" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Save Settings'}
            </Button>
          </section>
        </form>
      )}

      <ResetPasswordCard />
    </Layout>
  );
}

function ResetPasswordCard() {
  const { register, handleSubmit, reset, formState: { isSubmitting } } = useForm();

  const onSubmit = async (values) => {
    try {
      await authApi.resetPassword(values.currentPassword, values.newPassword);
      toast.success('Password updated successfully');
      reset();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update password');
    }
  };

  return (
    <section className="bg-white border border-gray-200 rounded-xl p-5 mt-6 max-w-lg">
      <h3 className="font-bold text-navy-900 mb-4">Reset Password</h3>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <Label>Current Password</Label>
          <Input type="password" {...register('currentPassword', { required: true })} />
        </div>
        <div>
          <Label>New Password</Label>
          <Input type="password" {...register('newPassword', { required: true, minLength: 6 })} />
        </div>
        <Button type="submit" variant="primary" disabled={isSubmitting}>
          {isSubmitting ? 'Updating...' : 'Update Password'}
        </Button>
      </form>
    </section>
  );
}
