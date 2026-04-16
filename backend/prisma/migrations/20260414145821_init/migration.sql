-- CreateTable
CREATE TABLE "mpuj_metadata" (
    "id" TEXT NOT NULL,
    "route_name" TEXT NOT NULL,
    "route_code" TEXT,
    "description" TEXT,
    "is_bidirectional" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mpuj_metadata_pkey" PRIMARY KEY ("id")
);
