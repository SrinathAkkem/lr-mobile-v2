export type UserRole = "executive" | "company_admin";
export type LRStatus = "pending" | "approved" | "rejected" | "in_transit" | "delivered";
export type PaymentMode = "To Pay" | "Paid" | "To Be Billed";

export interface User {
  id: string;
  name: string;
  role: UserRole;
  companyId: string | null;
  branchId: string | null;
  mobile: string;
  status?: "active" | "inactive" | "invited";
  company?: { id: string; name: string; lrCode?: string; status?: "pending" | "active" | "suspended" };
  branch?: { id: string; name: string; city: string };
}

export interface Company {
  id: string;
  name: string;
  address: string;
  gstNumber: string;
  lrCode: string;
  contactPhone?: string;
  logoUrl?: string;
  stampUrl?: string;
  maxBranches: number;
  maxExecutives: number;
  maxLrPerMonth: number;
  status: "pending" | "active" | "suspended";
}

export interface DashboardStats {
  totalLrs: number;
  pending: number;
  approved: number;
  rejected: number;
  delivered: number;
  inTransit: number;
  freightTotal: number;
  approvalRate: number;
}

export interface LRRequest {
  id: string;
  lrNumber: string | null;
  trackingId: string;
  companyId?: string;
  branchId?: string;
  executiveId?: string;
  consignorName: string;
  consignorAddress: string;
  consigneeName: string;
  consigneeAddress: string;
  consigneePhone: string;
  consigneeCompany?: string | null;
  originCity: string;
  destinationCity: string;
  vehicleNumber: string;
  goodsDescription: string;
  noOfPackages: number;
  weightKg: number;
  declaredValue: number;
  freightAmount: number;
  paymentMode: string;
  dispatchDate: string;
  specialInstructions?: string;
  photos: string[];
  signatureUrl?: string;
  status: LRStatus;
  rejectionReason?: string;
  pdfUrl?: string;
  qrCode?: string;
  createdAt: string;
  updatedAt?: string;
  approvedAt?: string | null;
  deliveredAt?: string | null;
  executive?: { name: string; mobile?: string };
  branch?: { id: string; name: string; city: string };
  company?: { id: string; name: string; lrCode?: string };
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  lrId?: string;
  read: boolean;
  createdAt: string;
}

export interface Executive {
  id: string;
  name: string;
  mobile: string;
  status: string;
  lrsThisMonth: number;
  branch?: { id: string; name: string; city: string } | null;
}

export interface Address {
  id: string;
  type: "consigner" | "consignee";
  name: string;
  company?: string;
  address: string;
  pincode?: string;
  phone: string;
  userId: string;
  createdAt: string;
}

export interface ExecutiveDashboardStats {
  totalLrs: number;
  pending: number;
  approved: number;
  rejected: number;
  delivered: number;
}

export interface CreateLRFormData {
  // Step 1
  consignerName: string;
  consignerAddress: string;
  consigneeCompany: string;
  consigneeName: string;
  consigneeAddress: string;
  consigneeMobile: string;
  lrDate: Date;
  // Step 2
  originCity: string;
  destinationCity: string;
  vehicleNumber: string;
  goodsDescription: string;
  goodsDescriptionDetail: string;
  // Step 3
  packageCount: string;
  weight: string;
  declaredValue: string;
  freightAmount: string;
  paymentMode: string;
  specialInstructions: string;
  saveConsignerAddress: boolean;
  saveConsigneeAddress: boolean;
  // Step 4
  goodsPhotos: string[];
  signature: string;
}
