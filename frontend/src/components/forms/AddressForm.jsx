import React, { useState, useEffect } from 'react';
import Input from '../ui/Input';
import Button from '../ui/Button';
import { X } from 'lucide-react';

const AddressForm = ({ 
  onSubmit, 
  onCancel, 
  loading = false, 
  initialAddress = null,
  isEditing = false 
}) => {
  const [formData, setFormData] = useState({
    full_name: '',
    phone: '',
    address_line_1: '',
    address_line_2: '',
    city: '',
    state: '',
    pincode: '',
    country: 'India',
    address_type: 'home'
  });

  useEffect(() => {
    if (initialAddress) {
      setFormData({
        full_name: initialAddress.full_name || '',
        phone: initialAddress.phone || '',
        address_line_1: initialAddress.address_line_1 || '',
        address_line_2: initialAddress.address_line_2 || '',
        city: initialAddress.city || '',
        state: initialAddress.state || '',
        pincode: initialAddress.pincode || '',
        country: initialAddress.country || 'India',
        address_type: initialAddress.address_type || 'home'
      });
    }
  }, [initialAddress]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 bg-white border border-gray-100 p-6 rounded-sm">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-bold">
          {isEditing ? 'Edit Address' : 'Add New Address'}
        </h3>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="text-gray-500 hover:text-gray-700"
          >
            <X size={24} />
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input
          label="Full Name"
          name="full_name"
          type="text"
          required
          value={formData.full_name}
          onChange={handleChange}
          placeholder="John Doe"
        />
        <Input
          label="Phone Number"
          name="phone"
          type="tel"
          required
          value={formData.phone}
          onChange={handleChange}
          placeholder="+91 98765 43210"
        />
      </div>

      <Input
        label="Address Line 1"
        name="address_line_1"
        type="text"
        required
        value={formData.address_line_1}
        onChange={handleChange}
        placeholder="Street address, building, etc."
      />

      <Input
        label="Address Line 2 (Optional)"
        name="address_line_2"
        type="text"
        value={formData.address_line_2}
        onChange={handleChange}
        placeholder="Apartment, suite, floor, etc."
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Input
          label="City"
          name="city"
          type="text"
          required
          value={formData.city}
          onChange={handleChange}
          placeholder="Mumbai"
        />
        <Input
          label="State"
          name="state"
          type="text"
          required
          value={formData.state}
          onChange={handleChange}
          placeholder="Maharashtra"
        />
        <Input
          label="Pincode"
          name="pincode"
          type="text"
          required
          value={formData.pincode}
          onChange={handleChange}
          placeholder="400001"
        />
        <div className="flex flex-col">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Country
          </label>
          <input
            type="text"
            name="country"
            value={formData.country}
            onChange={handleChange}
            disabled
            className="block w-full border border-gray-300 rounded-sm px-3 py-2 bg-gray-50 text-gray-500 cursor-not-allowed"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Address Type
        </label>
        <div className="flex gap-4">
          {['home', 'work', 'other'].map((type) => (
            <label key={type} className="flex items-center gap-2">
              <input
                type="radio"
                name="address_type"
                value={type}
                checked={formData.address_type === type}
                onChange={handleChange}
                className="w-4 h-4 cursor-pointer"
              />
              <span className="capitalize text-sm">{type}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="flex gap-4 pt-4">
        <Button
          type="submit"
          className="flex-1"
          isLoading={loading}
        >
          {isEditing ? 'Save Changes' : 'Add Address'}
        </Button>
        {onCancel && (
          <Button
            type="button"
            variant="outline"
            className="flex-1"
            onClick={onCancel}
            disabled={loading}
          >
            Cancel
          </Button>
        )}
      </div>
    </form>
  );
};

export default AddressForm;
