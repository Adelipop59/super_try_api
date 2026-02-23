import { UGCStatus, UGCType } from '@prisma/client';

export class UGCResponseDto {
  id: string;
  type: UGCType;
  description: string;
  contentUrl?: string;
  comment?: string;

  // Bonus
  requestedBonus?: number;
  paidBonus?: number;

  // Deadline
  deadline?: Date;

  // Status
  status: UGCStatus;

  // Validation
  validatedAt?: Date;
  validatedBy?: string;
  validationComment?: string;

  // Rejection
  rejectedAt?: Date;
  rejectionReason?: string;

  // Decline
  declinedAt?: Date;
  declineReason?: string;

  // Submission
  submittedAt?: Date;

  // Relations IDs
  sessionId?: string;
  chatOrderId?: string;
  requestedBy: string;
  submittedBy?: string;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;

  // Optional nested relations
  requester?: {
    id: string;
    firstName?: string;
    lastName?: string;
    email: string;
    companyName?: string;
  };

  submitter?: {
    id: string;
    firstName?: string;
    lastName?: string;
    email: string;
    avatar?: string;
  };

  transactions?: Array<{
    id: string;
    type: string;
    amount: number;
    status: string;
    createdAt: Date;
  }>;
}

export class UGCListResponseDto {
  ugcs: UGCResponseDto[];
  total: number;
  requested: number;
  submitted: number;
  validated: number;
  rejected: number;
  declined: number;
  totalRequestedBonus: number;
  totalPaidBonus: number;
}
