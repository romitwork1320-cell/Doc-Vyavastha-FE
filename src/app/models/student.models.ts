export interface College {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface StudentCategory {
  id: string;
  name: string;
  description: string;
  status: 'Active' | 'Inactive';
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface StudentCodeConfiguration {
  id: string;
  categoryId: string;
  businessYear: number;
  prefix: string;
  separator: string;
  paddingLength: number;
  resetSequence: boolean;
  isActive: boolean;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface StudentCodeSequence {
  id: string;
  yearConfigId: string;
  currentNumber: number;
  lastGeneratedCode: string;
  updatedAt: Date | string;
}

export interface ApplicationType {
  id: string;
  name: string;
  description: string;
  status: 'Active' | 'Inactive';
  inUse?: boolean;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface FormType {
  id: string;
  name: string;
  description?: string;
  status: 'Active' | 'Inactive';
  displayOrder: number;
  inUse?: boolean;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface ApplicationStatus {
  id: string;
  name: string;
  description?: string;
  colorCode: string;
  status: 'Active' | 'Inactive';
  displayOrder: number;
  inUse?: boolean;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface StudentCaste {
  id: string;
  name: string;
  description?: string;
  status: 'Active' | 'Inactive';
  createdAt: string;
  updatedAt: string;
}

export interface Student {
  id: string;
  studentCode: string;
  categoryId: string;
  casteId?: string;
  branchId?: string;
  yearConfigId?: string;
  fullName: string;
  fatherName?: string;
  motherName?: string;
  gender: 'Male' | 'Female' | 'Other';
  email?: string;
  
  // Contact
  primaryMobile: string;
  secondaryMobile?: string;
  whatsappMobile?: string;

  // Address
  homeAddress?: string;
  city?: string;
  state?: string;
  pincode?: string;

  // Academic
  schoolName?: string;
  passingBoard?: string;
  tenthPassingYear?: number;
  twelfthPassingYear?: number;

  // Scholarship
  scholarshipUid?: string;
  scholarshipPassword?: string;

  // Other Info
  profilePhotoUrl?: string;
  status: string;
  remarks?: string;
  createdAt: string;
  updatedAt: string;
  assignedCodes?: string[];
  appPortalId?: string;
  appPortalPassword?: string;
}

export interface StudentApplication {
  id: string;
  studentId: string;
  applicationTypeId: string;
  applicationStatusId: string;
  applicationNumber?: string;
  applicationName?: string;
  lastDate?: Date | string;
  appliedDate: Date | string;
  submittedDate?: Date | string;
  formTypeId?: string;
  colleges?: College[];
  userId?: string;
  password?: string;
  remarks: string;
}
