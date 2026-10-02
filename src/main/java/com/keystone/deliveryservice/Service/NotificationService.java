package com.keystone.deliveryservice.Service;

import java.util.Collection;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.keystone.deliveryservice.DTO.NotificationDTO;
import com.keystone.deliveryservice.ENUM.NotificationType;
import com.keystone.deliveryservice.ENUM.Role;
import com.keystone.deliveryservice.Entity.Notification;
import com.keystone.deliveryservice.Entity.UserAuth;
import com.keystone.deliveryservice.Repository.NotificationRepository;
import com.keystone.deliveryservice.Repository.UserAuthRepository;

/**
 * In-app notifications. Each recipient gets their own row, so read status is per user and a
 * user can only ever list or mark their own notifications.
 */
@Service
@Transactional
public class NotificationService {

    public static final String WORK_ORDER = "WORK_ORDER";
    public static final String PAYMENT = "PAYMENT";

    private final NotificationRepository notificationRepository;
    private final UserAuthRepository userRepository;

    public NotificationService(NotificationRepository notificationRepository, UserAuthRepository userRepository) {
        this.notificationRepository = notificationRepository;
        this.userRepository = userRepository;
    }

    /** What a notification points at, e.g. work order 12 labelled "WO-1012". */
    public record Ref(String type, Long id, String label) {
        public static Ref none() {
            return new Ref(null, null, null);
        }
    }

    public void notifyUser(UserAuth recipient, NotificationType type, String title, String message, Ref ref) {
        if (recipient != null) {
            send(List.of(recipient), null, type, title, message, ref);
        }
    }

    /** Every user holding one of the roles, except the person who caused the event. */
    public void notifyRoles(Set<Role> roles, UserAuth actor, NotificationType type, String title, String message, Ref ref) {
        send(userRepository.findByRoleIn(roles), actor, type, title, message, ref);
    }

    /** Every user linked to the customer organisation, except the person who caused the event. */
    public void notifyCustomerOrganisation(Long customerId, UserAuth actor, NotificationType type, String title,
            String message, Ref ref) {
        if (customerId != null) {
            send(userRepository.findByCustomerId(customerId), actor, type, title, message, ref);
        }
    }

    private void send(Collection<UserAuth> recipients, UserAuth actor, NotificationType type, String title,
            String message, Ref ref) {
        // De-duplicate by id: a user may match more than one audience.
        Map<Long, UserAuth> unique = new LinkedHashMap<>();
        for (UserAuth user : recipients) {
            if (user.getId() != null && (actor == null || !user.getId().equals(actor.getId()))) {
                unique.putIfAbsent(user.getId(), user);
            }
        }
        Ref reference = ref == null ? Ref.none() : ref;
        List<Notification> rows = unique.values().stream()
                .map(user -> Notification.builder()
                        .recipient(user)
                        .type(type)
                        .title(truncate(title, 200))
                        .message(truncate(message, 1000))
                        .referenceType(reference.type())
                        .referenceId(reference.id())
                        .referenceLabel(truncate(reference.label(), 60))
                        .build())
                .toList();
        if (!rows.isEmpty()) {
            notificationRepository.saveAll(rows);
        }
    }

    @Transactional(readOnly = true)
    public Page<NotificationDTO> listFor(UserAuth user, int page, int size) {
        return notificationRepository
                .findByRecipientIdOrderByCreatedAtDesc(user.getId(),
                        PageRequest.of(Math.max(page, 0), Math.min(Math.max(size, 1), 100)))
                .map(NotificationService::toDTO);
    }

    @Transactional(readOnly = true)
    public long unreadCount(UserAuth user) {
        return notificationRepository.countByRecipientIdAndReadFalse(user.getId());
    }

    public NotificationDTO markRead(UserAuth user, Long notificationId) {
        // Looked up by id AND recipient: someone else's notification is simply "not found".
        Notification notification = notificationRepository.findByIdAndRecipientId(notificationId, user.getId())
                .orElseThrow(() -> new IllegalArgumentException("Notification not found"));
        notification.setRead(true);
        return toDTO(notificationRepository.save(notification));
    }

    public int markAllRead(UserAuth user) {
        return notificationRepository.markAllRead(user.getId());
    }

    private static NotificationDTO toDTO(Notification n) {
        return NotificationDTO.builder()
                .id(n.getId())
                .type(n.getType())
                .title(n.getTitle())
                .message(n.getMessage())
                .referenceType(n.getReferenceType())
                .referenceId(n.getReferenceId())
                .referenceLabel(n.getReferenceLabel())
                .read(n.isRead())
                .createdAt(n.getCreatedAt())
                .build();
    }

    private static String truncate(String value, int max) {
        return value == null || value.length() <= max ? value : value.substring(0, max - 1) + "…";
    }
}
