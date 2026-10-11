package com.keystone.deliveryservice.Security;

// Returned as 404. Also used when a record exists but belongs to someone else, so its existence is not revealed.
public class ResourceNotFoundException extends RuntimeException {
    public ResourceNotFoundException(String message) {
        super(message);
    }
}
