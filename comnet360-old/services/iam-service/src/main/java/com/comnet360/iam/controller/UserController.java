package com.comnet360.iam.controller;

import com.comnet360.iam.dto.request.UpdateProfileRequest;
import com.comnet360.iam.dto.request.UpdateRoleRequest;
import com.comnet360.iam.dto.response.UserResponse;
import com.comnet360.iam.service.UserService;
import io.swagger.v3.oas.annotations.Parameter;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;

    // GET /api/users
    // Admin and Service Manager can list all users
    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'SERVICE_MANAGER')")
    public ResponseEntity<List<UserResponse>> getAllUsers() {
        return ResponseEntity.ok(userService.getAllUsers());
    }

    // GET /api/users/{id}
    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'SERVICE_MANAGER') or " +
            "#id == authentication.principal.userId")
    public ResponseEntity<UserResponse> getUserById(@PathVariable Long id) {
        return ResponseEntity.ok(userService.getUserById(id));
    }

    // GET /api/users/me
    // Any authenticated user can get their own profile
    @GetMapping("/me")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<UserResponse> getMyProfile(
            @Parameter(hidden = true) @RequestHeader("X-User-Email") String email) {
        return ResponseEntity.ok(userService.getUserByEmail(email));
    }

    // PATCH /api/users/{id}/profile — update own name/phone; ADMIN can update anyone
    @PatchMapping("/{id}/profile")
    @PreAuthorize("hasRole('ADMIN') or #id == authentication.principal.userId")
    public ResponseEntity<UserResponse> updateProfile(
            @PathVariable Long id,
            @Valid @RequestBody UpdateProfileRequest request,
            @Parameter(hidden = true) @RequestHeader("X-User-Id") Long performedByUserId,
            HttpServletRequest httpRequest) {

        return ResponseEntity.ok(userService.updateProfile(
                id, request, performedByUserId, httpRequest.getRemoteAddr()));
    }

    // PUT /api/users/{id}/role
    // Admin only — assign a role to a user
    @PutMapping("/{id}/role")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<UserResponse> updateRole(
            @PathVariable Long id,
            @Valid @RequestBody UpdateRoleRequest request,
            @Parameter(hidden = true) @RequestHeader("X-User-Id") Long performedByUserId,
            HttpServletRequest httpRequest) {

        return ResponseEntity.ok(userService.updateRole(
                id, request, performedByUserId, httpRequest.getRemoteAddr()));
    }

    // PUT /api/users/{id}/status
    // Admin only — activate or deactivate a user
    @PutMapping("/{id}/status")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<UserResponse> updateStatus(
            @PathVariable Long id,
            @RequestBody Map<String, Boolean> body,
            @Parameter(hidden = true) @RequestHeader("X-User-Id") Long performedByUserId,
            HttpServletRequest httpRequest) {

        boolean active = body.getOrDefault("isActive", true);
        return ResponseEntity.ok(userService.setActiveStatus(
                id, active, performedByUserId, httpRequest.getRemoteAddr()));
    }
}