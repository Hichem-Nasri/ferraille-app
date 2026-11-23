package tn.ferraille.listing;

import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import tn.ferraille.seo.Slugs;
import tn.ferraille.user.SellerType;
import tn.ferraille.user.User;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

public final class ListingDtos {

    private ListingDtos() {
    }

    public record FitDto(
            @NotBlank @Size(max = 60) String make,
            @NotBlank @Size(max = 60) String model,
            @Min(1950) @Max(2100) Integer yearFrom,
            @Min(1950) @Max(2100) Integer yearTo) {

        public static FitDto from(VehicleFit f) {
            return new FitDto(f.getMake(), f.getModel(), f.getYearFrom(), f.getYearTo());
        }

        public VehicleFit toEntity() {
            return new VehicleFit(make.trim(), model.trim(), yearFrom, yearTo);
        }
    }

    public record ListingRequest(
            @NotBlank @Size(max = 140) String title,
            @Size(max = 4000) String description,
            @NotNull Category category,
            @NotNull PartCondition condition,
            @DecimalMin("0.000") @DecimalMax("999999.000") BigDecimal price,
            boolean negotiable,
            @NotBlank @Size(max = 80) String city,
            @Size(max = 60) String oemReference,
            @NotEmpty @Size(max = 8) List<@NotBlank @Size(max = 400) String> photos,
            @NotEmpty @Size(max = 12) List<@Valid FitDto> fits) {
    }

    public record SellerSummary(Long id, String displayName, SellerType sellerType, boolean verified,
                                String city, long listingsCount, String avatarUrl, String phone, String whatsapp,
                                String facebookUrl, Instant memberSince) {

        public static SellerSummary from(User u, long listingsCount) {
            return new SellerSummary(u.getId(), u.getDisplayName(), u.getSellerType(), u.isVerified(), u.getCity(),
                    listingsCount, u.getAvatarUrl(), u.getPhone(), u.getWhatsapp(), u.getFacebookUrl(), u.getCreatedAt());
        }
    }

    public record ListingSummary(Long id, String slug, String title, BigDecimal price, Category category, PartCondition condition,
                                 String city, String coverPhoto, SellerType sellerType, String fitsLabel,
                                 ListingStatus status, int views, int contactClicks, boolean featured,
                                 boolean sellerVerified, Long sellerId, Instant createdAt) {

        public static ListingSummary from(Listing l) {
            return new ListingSummary(l.getId(), Slugs.of(l.getTitle()), l.getTitle(), l.getPrice(), l.getCategory(), l.getCondition(),
                    l.getCity(), l.getPhotos().isEmpty() ? null : l.getPhotos().get(0),
                    l.getSeller().getSellerType(), ListingDtos.fitsLabel(l.getFits()), l.getStatus(), l.getViews(), l.getContactClicks(),
                    l.isFeatured(), l.getSeller().isVerified(), l.getSeller().getId(), l.getCreatedAt());
        }
    }

    public record ListingDetail(Long id, String slug, String title, String description, BigDecimal price, boolean negotiable,
                                Category category, PartCondition condition, String city, String oemReference,
                                ListingStatus status, int views, List<String> photos, List<FitDto> fits,
                                SellerSummary seller, boolean featured, Instant createdAt) {

        public static ListingDetail from(Listing l, long sellerSales) {
            return new ListingDetail(l.getId(), Slugs.of(l.getTitle()), l.getTitle(), l.getDescription(), l.getPrice(), l.isNegotiable(),
                    l.getCategory(), l.getCondition(), l.getCity(), l.getOemReference(), l.getStatus(), l.getViews(),
                    List.copyOf(l.getPhotos()), l.getFits().stream().map(FitDto::from).toList(),
                    SellerSummary.from(l.getSeller(), sellerSales), l.isFeatured(), l.getCreatedAt());
        }
    }

    static String fitsLabel(List<VehicleFit> fits) {
        if (fits.isEmpty()) {
            return null;
        }
        VehicleFit f = fits.get(0);
        StringBuilder sb = new StringBuilder(f.getMake()).append(' ').append(f.getModel());
        if (f.getYearFrom() != null || f.getYearTo() != null) {
            sb.append(" · ")
                    .append(f.getYearFrom() != null ? f.getYearFrom() : "…")
                    .append('–')
                    .append(f.getYearTo() != null ? f.getYearTo() : "…");
        }
        if (fits.size() > 1) {
            sb.append(" +").append(fits.size() - 1);
        }
        return sb.toString();
    }
}
