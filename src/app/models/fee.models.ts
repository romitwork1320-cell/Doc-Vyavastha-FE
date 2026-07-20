export interface FeeType {
  id: string;
  name: string;
  description: string;
  categoryIds?: string[];
  status: 'Active' | 'Inactive';
  amount: number;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface StudentFeePlan {
  id: string;
  studentId: string;
  feeTypeId?: string; // Optional now that feeName is used
  feeName?: string; // The typed text field
  totalAmount: number;
  discountAmount?: number;
  discountReason?: string;
  remarks: string;
  createdAt: Date | string;
  updatedAt: Date | string;
  
  // Frontend purely calculated fields
  feeTypeName?: string; // Mapped from FeeType
  createdByName?: string; // Mapped from CreatedBy user
  collected?: number;
  pending?: number;
  status?: 'Pending' | 'Partially Paid' | 'Paid';
}

export interface StudentPayment {
  id: string;
  paymentNumber: string;
  receiptNumber?: string;
  studentId: string;
  studentFeePlanId: string;
  paymentDate: Date | string;
  amount: number;
  paymentMethod: string;
  referenceNumber: string;
  remarks: string;
  createdAt: Date | string;
  updatedAt: Date | string;
  
  // Frontend purely calculated fields
  feeTypeName?: string; // Mapped from FeeType via StudentFeePlan
  createdByName?: string; // Mapped from CreatedBy user
}
