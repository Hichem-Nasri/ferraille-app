package tn.ferraille.user;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

import java.time.Instant;

@Entity
@Table(name = "users")
@Getter
@Setter
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "full_name", nullable = false)
    private String fullName;

    @Column(unique = true)
    private String email;

    private String phone;

    @Column(name = "password_hash")
    private String passwordHash;

    @Column(name = "facebook_id", unique = true)
    private String facebookId;

    @Column(name = "avatar_url")
    private String avatarUrl;

    private String whatsapp;

    @Column(name = "facebook_url")
    private String facebookUrl;

    private String address;

    @Column(name = "opening_hours")
    private String openingHours;

    private String bio;

    private String city;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Role role = Role.USER;

    @Enumerated(EnumType.STRING)
    @Column(name = "seller_type", nullable = false)
    private SellerType sellerType = SellerType.PARTICULIER;

    @Column(name = "shop_name")
    private String shopName;

    @Column(nullable = false)
    private boolean verified;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @PrePersist
    void onCreate() {
        if (createdAt == null) {
            createdAt = Instant.now();
        }
    }

    public boolean hasContact() {
        return (whatsapp != null && !whatsapp.isBlank()) || (phone != null && !phone.isBlank());
    }

    public String getDisplayName() {
        return sellerType == SellerType.PRO && shopName != null && !shopName.isBlank() ? shopName : fullName;
    }
}
