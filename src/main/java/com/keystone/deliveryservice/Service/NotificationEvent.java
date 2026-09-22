package com.keystone.deliveryservice.Service;

public record NotificationEvent(String recipientEmail, String subject, String body) {
}
