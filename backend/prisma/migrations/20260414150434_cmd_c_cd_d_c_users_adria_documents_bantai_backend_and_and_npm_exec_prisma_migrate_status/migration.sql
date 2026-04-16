-- CreateEnum
CREATE TYPE "JeepneyStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateTable
CREATE TABLE "mpuj_jeepneys" (
    "id" TEXT NOT NULL,
    "vehicle_id" TEXT NOT NULL,
    "driver_name" TEXT NOT NULL,
    "plate_number" TEXT NOT NULL,
    "vehicle_type" TEXT NOT NULL,
    "vehicle_model" TEXT NOT NULL,
    "operator" TEXT NOT NULL,
    "route" TEXT NOT NULL,
    "sitting_capacity" INTEGER NOT NULL,
    "standing_capacity" INTEGER NOT NULL,
    "speed_limit" INTEGER NOT NULL,
    "status" "JeepneyStatus" NOT NULL DEFAULT 'ACTIVE',
    "registration_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "violation_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mpuj_jeepneys_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "mpuj_jeepneys_vehicle_id_key" ON "mpuj_jeepneys"("vehicle_id");
