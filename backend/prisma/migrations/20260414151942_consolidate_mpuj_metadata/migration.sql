/*
  Warnings:

  - You are about to drop the column `is_bidirectional` on the `mpuj_metadata` table. All the data in the column will be lost.
  - You are about to drop the `mpuj_jeepneys` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[vehicle_id]` on the table `mpuj_metadata` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `driver_name` to the `mpuj_metadata` table without a default value. This is not possible if the table is not empty.
  - Added the required column `operator` to the `mpuj_metadata` table without a default value. This is not possible if the table is not empty.
  - Added the required column `plate_number` to the `mpuj_metadata` table without a default value. This is not possible if the table is not empty.
  - Added the required column `sitting_capacity` to the `mpuj_metadata` table without a default value. This is not possible if the table is not empty.
  - Added the required column `speed_limit` to the `mpuj_metadata` table without a default value. This is not possible if the table is not empty.
  - Added the required column `standing_capacity` to the `mpuj_metadata` table without a default value. This is not possible if the table is not empty.
  - Added the required column `vehicle_id` to the `mpuj_metadata` table without a default value. This is not possible if the table is not empty.
  - Added the required column `vehicle_model` to the `mpuj_metadata` table without a default value. This is not possible if the table is not empty.
  - Added the required column `vehicle_type` to the `mpuj_metadata` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "mpuj_metadata" DROP COLUMN "is_bidirectional",
ADD COLUMN     "driver_name" TEXT NOT NULL,
ADD COLUMN     "operator" TEXT NOT NULL,
ADD COLUMN     "plate_number" TEXT NOT NULL,
ADD COLUMN     "registration_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "sitting_capacity" INTEGER NOT NULL,
ADD COLUMN     "speed_limit" INTEGER NOT NULL,
ADD COLUMN     "standing_capacity" INTEGER NOT NULL,
ADD COLUMN     "status" "JeepneyStatus" NOT NULL DEFAULT 'ACTIVE',
ADD COLUMN     "vehicle_id" TEXT NOT NULL,
ADD COLUMN     "vehicle_model" TEXT NOT NULL,
ADD COLUMN     "vehicle_type" TEXT NOT NULL,
ADD COLUMN     "violation_count" INTEGER NOT NULL DEFAULT 0;

-- DropTable
DROP TABLE "mpuj_jeepneys";

-- CreateIndex
CREATE UNIQUE INDEX "mpuj_metadata_vehicle_id_key" ON "mpuj_metadata"("vehicle_id");
