package tn.ferraille.community;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import tn.ferraille.listing.Category;
import tn.ferraille.user.SellerType;
import tn.ferraille.user.User;

import java.time.Instant;

public final class CommunityDtos {

    private CommunityDtos() {
    }

    public record PartRequestCreate(@NotBlank @Size(max = 60) String make,
                                    @NotBlank @Size(max = 60) String model,
                                    @Min(1950) @Max(2100) Integer year,
                                    Category category,
                                    @NotBlank @Size(min = 5, max = 500) String description,
                                    @Size(max = 80) String city) {
    }

    public record RequestAuthor(Long id, String displayName, String avatarUrl, String phone, String whatsapp,
                                String facebookUrl) {
        static RequestAuthor from(User u) {
            return new RequestAuthor(u.getId(), u.getDisplayName(), u.getAvatarUrl(), u.getPhone(), u.getWhatsapp(),
                    u.getFacebookUrl());
        }
    }

    public record PartRequestView(Long id, String make, String model, Integer year, Category category,
                                  String description, String city, PartRequest.Status status, Instant createdAt,
                                  RequestAuthor author, boolean mine) {
        static PartRequestView from(PartRequest r, Long viewerId) {
            return new PartRequestView(r.getId(), r.getMake(), r.getModel(), r.getYear(), r.getCategory(),
                    r.getDescription(), r.getCity(), r.getStatus(), r.getCreatedAt(), RequestAuthor.from(r.getUser()),
                    viewerId != null && viewerId.equals(r.getUser().getId()));
        }
    }

    public record ReviewCreate(@Min(1) @Max(5) int rating, @Size(max = 500) String comment) {
    }

    public record ReviewView(Long id, int rating, String comment, String authorName, String authorAvatar,
                             Instant createdAt) {
        static ReviewView from(Review r) {
            return new ReviewView(r.getId(), r.getRating(), r.getComment(), r.getAuthor().getDisplayName(),
                    r.getAuthor().getAvatarUrl(), r.getCreatedAt());
        }
    }

    public record SellerProfile(Long id, String displayName, SellerType sellerType, boolean verified, String city,
                                String address, String openingHours, String bio, String avatarUrl, String phone,
                                String whatsapp, String facebookUrl, Instant memberSince, long listingsCount,
                                Double rating, long reviewsCount) {
    }

    public record CasseCard(Long id, String displayName, boolean verified, String city, String address,
                            String openingHours, String avatarUrl, String phone, String whatsapp, String facebookUrl,
                            long listingsCount, Double rating, long reviewsCount) {
    }

    public record SavedSearchCreate(@Size(max = 120) String q, Category category, @Size(max = 60) String make,
                                    @Size(max = 60) String model, @Min(1950) @Max(2100) Integer year,
                                    @Size(max = 80) String city) {
    }

    public record SavedSearchView(Long id, String label, String q, Category category, String make, String model,
                                  Integer year, String city, long newCount, Instant createdAt) {
    }
}
