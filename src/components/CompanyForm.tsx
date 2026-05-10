import React, { useState } from 'react';
import { Building2, Save, AlertCircle } from 'lucide-react';
import { Company } from '../types';
import { useCompany } from '../context/CompanyContext';

const CompanyForm: React.FC = () => {
 const { company, initializeCompany, updateCompany } = useCompany();
 const [formData, setFormData] = useState<Omit<Company, 'id' | 'createdAt' | 'updatedAt'>>({
 name: company?.name || '',
 businessType: company?.businessType || 'Pharmaceutical',
 taxStructure: company?.taxStructure || 'Product Wise',
 financialYearStart: company?.financialYearStart || '2024-04-01',
 financialYearEnd: company?.financialYearEnd || '2025-03-31',
 gstin: company?.gstin || '',
 vatNumber: company?.vatNumber || '',
 drugLicenseNo: company?.drugLicenseNo || '',
 foodLicenseNo: company?.foodLicenseNo || '',
 valuationMethod: company?.valuationMethod || 'Last Purchase',
 address: company?.address || '',
 city: company?.city || '',
 state: company?.state || '',
 pinCode: company?.pinCode || '',
 country: company?.country || 'India',
 phone: company?.phone || '',
 email: company?.email || '',
 website: company?.website || '',
 logoUrl: company?.logoUrl || '',
 });
 
 const [errors, setErrors] = useState<Record<string, string>>({});
 const [showSuccess, setShowSuccess] = useState(false);

 const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
 const { name, value } = e.target;
 setFormData(prev => ({
 ...prev,
 [name]: value
 }));
 
 // Clear error when user starts typing
 if (errors[name]) {
 setErrors(prev => {
 const newErrors = { ...prev };
 delete newErrors[name];
 return newErrors;
 });
 }
 };

 const validateForm = (): boolean => {
 const newErrors: Record<string, string> = {};
 
 if (!formData.name.trim()) {
 newErrors.name = 'Company name is required';
 }
 
 if (!formData.gstin.trim()) {
 newErrors.gstin = 'GSTIN is required';
 } else if (!/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(formData.gstin.toUpperCase())) {
 newErrors.gstin = 'Invalid GSTIN format';
 }
 
 if (!formData.drugLicenseNo.trim()) {
 newErrors.drugLicenseNo = 'Drug License Number is required';
 }
 
 if (!formData.address.trim()) {
 newErrors.address = 'Address is required';
 }
 
 if (!formData.city.trim()) {
 newErrors.city = 'City is required';
 }
 
 if (!formData.state.trim()) {
 newErrors.state = 'State is required';
 }
 
 if (!formData.pinCode.trim()) {
 newErrors.pinCode = 'PIN Code is required';
 } else if (!/^\d{6}$/.test(formData.pinCode)) {
 newErrors.pinCode = 'Invalid PIN Code format';
 }
 
 if (!formData.phone.trim()) {
 newErrors.phone = 'Phone number is required';
 } else if (!/^[0-9]{10,12}$/.test(formData.phone)) {
 newErrors.phone = 'Invalid phone number format';
 }
 
 if (!formData.email.trim()) {
 newErrors.email = 'Email is required';
 } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
 newErrors.email = 'Invalid email format';
 }
 
 setErrors(newErrors);
 return Object.keys(newErrors).length === 0;
 };

 const handleSubmit = (e: React.FormEvent) => {
 e.preventDefault();
 
 if (validateForm()) {
 if (company) {
 // Update existing company
 updateCompany(formData);
 } else {
 // Initialize new company
 initializeCompany(formData);
 }
 
 setShowSuccess(true);
 setTimeout(() => setShowSuccess(false), 3000);
 }
 };

 return (
 <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
 <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center gap-2">
 <Building2 className="text-primary" size={20} />
 <h3 className="font-bold text-slate-800">Company Information</h3>
 </div>
 <div className="p-6">
 {showSuccess && (
 <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-700 rounded-lg flex items-center gap-2">
 <Save size={16} />
 <span>Company information saved successfully!</span>
 </div>
 )}
 
 <form onSubmit={handleSubmit} className="space-y-4">
 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
 <div>
 <label className="block text-sm font-medium text-slate-700 mb-1">Company Name *</label>
 <input
 type="text"
 name="name"
 value={formData.name}
 onChange={handleChange}
 className={`w-full border ${errors.name ? 'border-red-500' : 'border-slate-300'} rounded-lg px-3 py-2 text-sm`}
 placeholder="Enter company name"
 />
 {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
 </div>
 
 <div>
 <label className="block text-sm font-medium text-slate-700 mb-1">Business Type *</label>
 <select
 name="businessType"
 value={formData.businessType}
 onChange={handleChange}
 className={`w-full border ${errors.businessType ? 'border-red-500' : 'border-slate-300'} rounded-lg px-3 py-2 text-sm bg-white`}
 >
 <option value="Pharmaceutical">Pharmaceutical</option>
 <option value="Medical Device">Medical Device</option>
 <option value="Food Supplement">Food Supplement</option>
 <option value="Cosmetic">Cosmetic</option>
 <option value="Biotech">Biotech</option>
 <option value="Generic Medicine">Generic Medicine</option>
 <option value="Retail Pharmacy">Retail Pharmacy</option>
 </select>
 </div>
 </div>
 
 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
 <div>
 <label className="block text-sm font-medium text-slate-700 mb-1">Tax Structure *</label>
 <select
 name="taxStructure"
 value={formData.taxStructure}
 onChange={handleChange}
 className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white"
 >
 <option value="Product Wise">Product Wise</option>
 <option value="Invoice Wise">Invoice Wise</option>
 </select>
 <p className="text-xs text-slate-500 mt-1">Determines how taxes are calculated</p>
 </div>
 
 <div>
 <label className="block text-sm font-medium text-slate-700 mb-1">Valuation Method *</label>
 <select
 name="valuationMethod"
 value={formData.valuationMethod}
 onChange={handleChange}
 className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white"
 >
 <option value="Last Purchase">Last Purchase</option>
 <option value="Average Cost">Average Cost</option>
 <option value="FIFO">FIFO (First In First Out)</option>
 <option value="LIFO">LIFO (Last In First Out)</option>
 </select>
 <p className="text-xs text-slate-500 mt-1">Inventory valuation method</p>
 </div>
 </div>
 
 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
 <div>
 <label className="block text-sm font-medium text-slate-700 mb-1">Financial Year Start *</label>
 <input
 type="date"
 name="financialYearStart"
 value={formData.financialYearStart}
 onChange={handleChange}
 className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
 />
 </div>
 
 <div>
 <label className="block text-sm font-medium text-slate-700 mb-1">Financial Year End *</label>
 <input
 type="date"
 name="financialYearEnd"
 value={formData.financialYearEnd}
 onChange={handleChange}
 className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
 />
 </div>
 </div>
 
 <div className="border-t border-slate-200 pt-4">
 <h4 className="font-medium text-slate-800 mb-3">Licenses & Registrations</h4>
 
 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
 <div>
 <label className="block text-sm font-medium text-slate-700 mb-1">GSTIN * (15-digit)</label>
 <input
 type="text"
 name="gstin"
 value={formData.gstin}
 onChange={handleChange}
 className={`w-full border ${errors.gstin ? 'border-red-500' : 'border-slate-300'} rounded-lg px-3 py-2 text-sm uppercase`}
 placeholder="12ABCDE1234F1Z5"
 />
 {errors.gstin && <p className="text-red-500 text-xs mt-1">{errors.gstin}</p>}
 </div>
 
 <div>
 <label className="block text-sm font-medium text-slate-700 mb-1">VAT Number</label>
 <input
 type="text"
 name="vatNumber"
 value={formData.vatNumber}
 onChange={handleChange}
 className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
 placeholder="Optional VAT registration number"
 />
 </div>
 </div>
 
 <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
 <div>
 <label className="block text-sm font-medium text-slate-700 mb-1">Drug License No. *</label>
 <input
 type="text"
 name="drugLicenseNo"
 value={formData.drugLicenseNo}
 onChange={handleChange}
 className={`w-full border ${errors.drugLicenseNo ? 'border-red-500' : 'border-slate-300'} rounded-lg px-3 py-2 text-sm`}
 placeholder="Required for pharmaceutical businesses"
 />
 {errors.drugLicenseNo && <p className="text-red-500 text-xs mt-1">{errors.drugLicenseNo}</p>}
 </div>
 
 <div>
 <label className="block text-sm font-medium text-slate-700 mb-1">Food License No.</label>
 <input
 type="text"
 name="foodLicenseNo"
 value={formData.foodLicenseNo}
 onChange={handleChange}
 className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
 placeholder="Optional - FSSAI license if applicable"
 />
 </div>
 </div>
 </div>
 
 <div className="border-t border-slate-200 pt-4">
 <h4 className="font-medium text-slate-800 mb-3">Contact Information</h4>
 
 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
 <div>
 <label className="block text-sm font-medium text-slate-700 mb-1">Phone * (10-12 digits)</label>
 <input
 type="tel"
 name="phone"
 value={formData.phone}
 onChange={handleChange}
 className={`w-full border ${errors.phone ? 'border-red-500' : 'border-slate-300'} rounded-lg px-3 py-2 text-sm`}
 placeholder="Enter phone number"
 />
 {errors.phone && <p className="text-red-500 text-xs mt-1">{errors.phone}</p>}
 </div>
 
 <div>
 <label className="block text-sm font-medium text-slate-700 mb-1">Email * (Valid email)</label>
 <input
 type="email"
 name="email"
 value={formData.email}
 onChange={handleChange}
 className={`w-full border ${errors.email ? 'border-red-500' : 'border-slate-300'} rounded-lg px-3 py-2 text-sm`}
 placeholder="Enter email address"
 />
 {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
 </div>
 </div>
 
 <div className="mt-4">
 <label className="block text-sm font-medium text-slate-700 mb-1">Website</label>
 <input
 type="url"
 name="website"
 value={formData.website}
 onChange={handleChange}
 className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
 placeholder="https://www.example.com"
 />
 </div>
 </div>
 
 <div className="border-t border-slate-200 pt-4">
 <h4 className="font-medium text-slate-800 mb-3">Address Information</h4>
 
 <div className="space-y-4">
 <div>
 <label className="block text-sm font-medium text-slate-700 mb-1">Address *</label>
 <textarea
 name="address"
 value={formData.address}
 onChange={handleChange}
 rows={2}
 className={`w-full border ${errors.address ? 'border-red-500' : 'border-slate-300'} rounded-lg px-3 py-2 text-sm`}
 placeholder="Enter complete address"
 ></textarea>
 {errors.address && <p className="text-red-500 text-xs mt-1">{errors.address}</p>}
 </div>
 
 <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
 <div>
 <label className="block text-sm font-medium text-slate-700 mb-1">City *</label>
 <input
 type="text"
 name="city"
 value={formData.city}
 onChange={handleChange}
 className={`w-full border ${errors.city ? 'border-red-500' : 'border-slate-300'} rounded-lg px-3 py-2 text-sm`}
 placeholder="Enter city"
 />
 {errors.city && <p className="text-red-500 text-xs mt-1">{errors.city}</p>}
 </div>
 
 <div>
 <label className="block text-sm font-medium text-slate-700 mb-1">State *</label>
 <input
 type="text"
 name="state"
 value={formData.state}
 onChange={handleChange}
 className={`w-full border ${errors.state ? 'border-red-500' : 'border-slate-300'} rounded-lg px-3 py-2 text-sm`}
 placeholder="Enter state"
 />
 {errors.state && <p className="text-red-500 text-xs mt-1">{errors.state}</p>}
 </div>
 
 <div>
 <label className="block text-sm font-medium text-slate-700 mb-1">PIN Code *</label>
 <input
 type="text"
 name="pinCode"
 value={formData.pinCode}
 onChange={handleChange}
 className={`w-full border ${errors.pinCode ? 'border-red-500' : 'border-slate-300'} rounded-lg px-3 py-2 text-sm`}
 placeholder="6-digit PIN"
 />
 {errors.pinCode && <p className="text-red-500 text-xs mt-1">{errors.pinCode}</p>}
 </div>
 </div>
 
 <div>
 <label className="block text-sm font-medium text-slate-700 mb-1">Country *</label>
 <input
 type="text"
 name="country"
 value={formData.country}
 onChange={handleChange}
 className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
 placeholder="Enter country"
 />
 </div>
 </div>
 </div>
 
 <div className="pt-4 flex justify-end">
 <button
 type="submit"
 className="flex items-center gap-2 px-4 py-2 bg-primary text-white font-medium rounded-lg hover:bg-sky-600 transition-colors"
 >
 <Save size={16} />
 {company ? 'Update Company' : 'Save Company'}
 </button>
 </div>
 </form>
 </div>
 </div>
 );
};

export default CompanyForm;
