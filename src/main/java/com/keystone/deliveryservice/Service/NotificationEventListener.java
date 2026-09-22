package com.keystone.deliveryservice.Service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import com.keystone.deliveryservice.DTO.EmailLogDTO;

@Component
public class NotificationEventListener {
    private static final Logger log = LoggerFactory.getLogger(NotificationEventListener.class);

    private final EmailLogService emailLogService;

    public NotificationEventListener(EmailLogService emailLogService) {
        this.emailLogService = emailLogService;
    }

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void deliver(NotificationEvent event) {
        try {
            emailLogService.notification(EmailLogDTO.builder()
                    .RecipientEmail(event.recipientEmail())
                    .subject(event.subject())
                    .body(event.body())
                    .build());
        } catch (RuntimeException exception) {
            log.error("Unable to record notification for {}", event.recipientEmail(), exception);
        }
    }
}
