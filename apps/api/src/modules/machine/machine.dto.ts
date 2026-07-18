import { Type } from 'class-transformer';
import {
  MachineStatus,
  MachineWorkRole,
  MaintenanceTaskPriority,
  MaintenanceTaskStatus,
  MaintenanceTaskType,
} from '@prisma/client';
import {
  IsArray,
  IsDateString,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';

export class CreateMachineDto {
  @IsString() @MinLength(1) code!: string;
  @IsString() @MinLength(1) name!: string;
  @IsOptional() @IsEnum(MachineStatus) status?: MachineStatus;
  @IsOptional() @IsString() note?: string;
}

export class UpdateMachineDto extends CreateMachineDto {}

export class CreateMachineAssignmentDto {
  @IsString() machineId!: string;
  @IsString() mechanicId!: string;
  @IsString() workShiftId!: string;
  @IsDateString() validFrom!: string;
  @IsOptional() @IsDateString() validTo?: string;
}

export class CreateMachinePieceRateDto {
  @IsString() productId!: string;
  @IsEnum(MachineWorkRole) workRole!: MachineWorkRole;
  @IsNumber() @Min(0) amount!: number;
  @IsDateString() effectiveFrom!: string;
  @IsOptional() @IsDateString() effectiveTo?: string;
}

export class CreateMaintenanceTaskDto {
  @IsString() machineId!: string;
  @IsString() assigneeMechanicId!: string;
  @IsEnum(MaintenanceTaskType) type!: MaintenanceTaskType;
  @IsEnum(MaintenanceTaskPriority) priority!: MaintenanceTaskPriority;
  @IsOptional() @IsDateString() dueAt?: string;
  @IsString() @MinLength(1) description!: string;
}

export class UpdateMaintenanceTaskDto {
  @IsEnum(MaintenanceTaskStatus) status!: MaintenanceTaskStatus;
  @IsOptional() @IsString() resolution?: string;
}

export class MeasurementMetricDto {
  @IsString() @MinLength(1) code!: string;
  @IsString() @MinLength(1) name!: string;
  @IsString() @MinLength(1) unit!: string;
  @IsNumber() target!: number;
  @IsNumber() min!: number;
  @IsNumber() max!: number;
  @IsInt() @Min(0) displayOrder!: number;
}

export class CreateMeasurementSpecificationDto {
  @IsArray() @ValidateNested({ each: true }) @Type(() => MeasurementMetricDto)
  metrics!: MeasurementMetricDto[];
}

export class ConfigureInspectionSlotDto {
  @IsString() workShiftId!: string;
  @IsInt() @Min(1) slotNumber!: number;
  @IsInt() @Min(0) minuteOffset!: number;
}

export class MeasurementValueDto {
  @IsString() metricId!: string;
  @IsNumber() value!: number;
}

export class SubmitInspectionDto {
  @IsArray() @ValidateNested({ each: true }) @Type(() => MeasurementValueDto)
  measurements!: MeasurementValueDto[];
}

export class ResolveQualityIssueDto {
  @IsOptional() @IsString() note?: string;
}
