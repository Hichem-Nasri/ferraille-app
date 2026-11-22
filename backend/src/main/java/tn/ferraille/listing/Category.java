package tn.ferraille.listing;

import java.util.Arrays;
import java.util.Optional;

public enum Category {
    MOTEUR("moteur", "Moteur", "moteur"),
    CARROSSERIE("carrosserie", "Carrosserie", "carrosserie"),
    ECLAIRAGE("eclairage", "Éclairage", "éclairage (phares, feux)"),
    JANTES_PNEUS("jantes-pneus", "Jantes & pneus", "jantes et pneus"),
    ELECTRICITE("electricite", "Électricité", "électricité (alternateurs, démarreurs)"),
    INTERIEUR("interieur", "Intérieur", "intérieur (sièges, tableau de bord)"),
    FREINAGE("freinage", "Freinage", "freinage (disques, étriers)"),
    TRANSMISSION("transmission", "Transmission", "transmission (boîtes de vitesses, cardans)"),
    AUTRE("autres", "Autres pièces", "autres pièces");

    private final String slug;
    private final String label;
    private final String seoLabel;

    Category(String slug, String label, String seoLabel) {
        this.slug = slug;
        this.label = label;
        this.seoLabel = seoLabel;
    }

    public String slug() {
        return slug;
    }

    public String label() {
        return label;
    }

    public String seoLabel() {
        return seoLabel;
    }

    public static Optional<Category> fromSlug(String slug) {
        return Arrays.stream(values()).filter(c -> c.slug.equalsIgnoreCase(slug)).findFirst();
    }
}
