package com.keystone.deliveryservice.Security;

// Thrown at login when the password is right but the email address has not been verified yet.
public class EmailNotVerifiedException extends RuntimeException {
    public EmailNotVerifiedException() {
        super("Please verify your email before logging in.");
    }
}
