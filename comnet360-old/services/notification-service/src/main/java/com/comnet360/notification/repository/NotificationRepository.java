package com.comnet360.notification.repository;

import com.comnet360.notification.entity.Notification;
import com.comnet360.notification.enums.NotificationCategory;
import com.comnet360.notification.enums.NotificationStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface NotificationRepository
        extends JpaRepository<Notification, Long> {

    List<Notification> findByUserIdOrderByCreatedDateDesc(Long userId);

    List<Notification> findByUserIdAndStatusOrderByCreatedDateDesc(
            Long userId, NotificationStatus status);

    List<Notification> findByUserIdAndCategoryOrderByCreatedDateDesc(
            Long userId, NotificationCategory category);

    long countByUserIdAndStatus(Long userId, NotificationStatus status);
}