package tn.ferraille.user;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public final class AuthDtos {

    private AuthDtos() {
    }

    public record RegisterRequest(
            @NotBlank @Size(max = 120) String fullName,
            @NotBlank @Email String email,
            @Size(max = 30) String phone,
            @NotBlank @Size(min = 8, max = 72) String password,
            @Size(max = 80) String city,
            @NotNull SellerType sellerType,
            @Size(max = 120) String shopName) {
    }

    public record ProfileRequest(
            @NotBlank @Size(max = 120) String fullName,
            @Size(max = 30) @Pattern(regexp = "^$|^[+0-9 ]{8,20}$", message = "Numéro de téléphone invalide") String phone,
            @Size(max = 30) @Pattern(regexp = "^$|^[+0-9 ]{8,20}$", message = "Numéro WhatsApp invalide") String whatsapp,
            @Size(max = 300) @Pattern(regexp = "^$|^https://(www\\.|m\\.|web\\.)?(facebook\\.com|fb\\.com|m\\.me)/.+$",
                    message = "Lien Facebook ou Messenger invalide (https://facebook.com/… ou https://m.me/…)") String facebookUrl,
            @Size(max = 80) String city,
            @NotNull SellerType sellerType,
            @Size(max = 120) String shopName) {
    }

    public record PasswordRequest(@NotBlank String currentPassword,
                                  @NotBlank @Size(min = 8, max = 72) String newPassword) {
    }

    public record LoginRequest(@NotBlank @Email String email, @NotBlank String password) {
    }

    public record UserResponse(Long id, String fullName, String displayName, String email, String phone,
                               String whatsapp, String facebookUrl, String avatarUrl, boolean facebookLinked,
                               boolean hasPassword, boolean hasContact, String city, Role role,
                               SellerType sellerType, String shopName, boolean verified) {

        public static UserResponse from(User u) {
            return new UserResponse(u.getId(), u.getFullName(), u.getDisplayName(), u.getEmail(), u.getPhone(),
                    u.getWhatsapp(), u.getFacebookUrl(), u.getAvatarUrl(), u.getFacebookId() != null,
                    u.getPasswordHash() != null, u.hasContact(), u.getCity(), u.getRole(), u.getSellerType(),
                    u.getShopName(), u.isVerified());
        }
    }

    public record FacebookLoginRequest(@NotBlank @Size(max = 2000) String accessToken) {
    }

    public record AuthConfig(String facebookAppId, String facebookGroupUrl) {
    }

    public record AuthResponse(String token, UserResponse user) {
    }
}
