package com.keystone.deliveryservice.Service.storage;

import java.io.IOException;

/**
 * Where uploaded files (work-order photos, documents) are kept.
 * The default implementation writes to a directory (STORAGE_DIR), which in the cloud can be a
 * mounted persistent volume or bucket (e.g. Cloud Storage FUSE, EFS, Azure Files). A provider SDK
 * implementation (S3, GCS, Azure Blob) can replace it without touching the callers.
 */
public interface StorageService {

    /** Stores the bytes under the key (e.g. "work-orders/12/uuid.jpg"). */
    void put(String key, byte[] content) throws IOException;

    byte[] get(String key) throws IOException;

    void delete(String key) throws IOException;
}
