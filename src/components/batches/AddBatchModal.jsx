import React, { useState, useEffect } from 'react';

const AddBatchModal = ({ isOpen, onClose, onAdd, editBatch }) => {
  const [formData, setFormData] = useState({
    medicineName: '',
    batchNumber: '',
    quantity: '',
    expiryDate: '',
    supplier: ''
  });

  // === INTHA PART THAAN MUKKIYAM ===
  useEffect(() => {
    if (editBatch) {
      // Edit panna bothu, existing data ah form la fill pannum
      setFormData({
        medicineName: editBatch.medicineName,
        batchNumber: editBatch.batchNumber,
        quantity: editBatch.quantity,
        expiryDate: editBatch.expiryDate,
        supplier: editBatch.supplier || ''
      });
    } else {
      // Add panna bothu, form ah empty pannum
      setFormData({ 
        medicineName: '', 
        batchNumber: '', 
        quantity: '', 
        expiryDate: '', 
        supplier: '' 
      });
    }
  }, [editBatch, isOpen]); // editBatch or isOpen maarum bothu run aagum

  if (!isOpen) return null;

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if(!formData.medicineName || !formData.batchNumber || !formData.quantity || !formData.expiryDate) {
      alert("Please fill all required fields");
      return;
    }

    const today = new Date();
    const expiry = new Date(formData.expiryDate);
    const diffTime = expiry - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    let status = "Active";
    if (diffDays < 0) status = "Expired";
    else if (diffDays <= 30) status = "Expiring Soon";

    const batchData = {
      ...formData,
      id: editBatch ? editBatch.id : `BATCH-${Math.floor(Math.random() * 10000)}`,
      quantity: parseInt(formData.quantity),
      status
    };

    onAdd(batchData, !!editBatch); 
    setFormData({ medicineName: '', batchNumber: '', quantity: '', expiryDate: '', supplier: '' });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6 transform transition-all">
        {/* Title dynamic ah irukanum */}
        <h2 className="text-xl font-bold mb-4 text-gray-800">
          {editBatch ? 'Edit Batch' : 'Add New Batch'}
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Medicine Name *</label>
            <input type="text" name="medicineName" value={formData.medicineName} onChange={handleChange} className="mt-1 w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500 outline-none" placeholder="e.g., Paracetamol 500mg" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Batch No *</label>
              <input type="text" name="batchNumber" value={formData.batchNumber} onChange={handleChange} className="mt-1 w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500 outline-none" placeholder="PCM2024A" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Quantity *</label>
              <input type="number" name="quantity" value={formData.quantity} onChange={handleChange} className="mt-1 w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500 outline-none" placeholder="100" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Expiry Date *</label>
            <input type="date" name="expiryDate" value={formData.expiryDate} onChange={handleChange} className="mt-1 w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500 outline-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Supplier</label>
            <input type="text" name="supplier" value={formData.supplier} onChange={handleChange} className="mt-1 w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Supplier Name" />
          </div>
          
          <div className="flex justify-end gap-3 mt-6">
            <button type="button" onClick={onClose} className="px-4 py-2 text-gray-600 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors">Cancel</button>
            <button type="submit" className="px-4 py-2 text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors shadow-md">
              {editBatch ? 'Update Batch' : 'Save Batch'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddBatchModal;