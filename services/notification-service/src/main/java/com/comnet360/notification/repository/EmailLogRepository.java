package com.comnet360.notification.repository;

import com.comnet360.notification.entity.EmailLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface EmailLogRepository extends JpaRepository<EmailLog, Long> {

    List<EmailLog> findByNotificationIdOrderByCreatedAtDesc(Long notificationId);

    List<EmailLog> findByStatusOrderByCreatedAtDesc(String status);
}