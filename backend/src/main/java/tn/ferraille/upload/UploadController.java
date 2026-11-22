package tn.ferraille.upload;

import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;
import tn.ferraille.common.ApiException;
import tn.ferraille.config.FerrailleProperties;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.time.YearMonth;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequiredArgsConstructor
public class UploadController {

    private static final Map<String, String> EXTENSIONS = Map.of(
            "image/jpeg", "jpg",
            "image/png", "png",
            "image/webp", "webp");

    private final FerrailleProperties properties;

    public record UploadResponse(List<String> urls) {
    }

    @PostMapping("/api/uploads")
    @ResponseStatus(HttpStatus.CREATED)
    public UploadResponse upload(@RequestParam("files") List<MultipartFile> files) throws IOException {
        if (files.isEmpty() || files.size() > 8) {
            throw ApiException.badRequest("Entre 1 et 8 photos");
        }
        String folder = YearMonth.now().toString();
        Path dir = Path.of(properties.uploadDir()).toAbsolutePath().normalize().resolve(folder);
        Files.createDirectories(dir);
        List<String> urls = new ArrayList<>();
        for (MultipartFile file : files) {
            String extension = EXTENSIONS.get(file.getContentType());
            if (extension == null || !looksLikeImage(file)) {
                throw ApiException.badRequest("Format accepté : JPG, PNG ou WebP");
            }
            String name = UUID.randomUUID() + "." + extension;
            try (InputStream in = file.getInputStream()) {
                Files.copy(in, dir.resolve(name), StandardCopyOption.REPLACE_EXISTING);
            }
            urls.add("/uploads/" + folder + "/" + name);
        }
        return new UploadResponse(urls);
    }

    private boolean looksLikeImage(MultipartFile file) throws IOException {
        byte[] head = new byte[12];
        int read;
        try (InputStream in = file.getInputStream()) {
            read = in.readNBytes(head, 0, head.length);
        }
        if (read < 4) {
            return false;
        }
        boolean jpeg = (head[0] & 0xFF) == 0xFF && (head[1] & 0xFF) == 0xD8;
        boolean png = (head[0] & 0xFF) == 0x89 && head[1] == 'P' && head[2] == 'N' && head[3] == 'G';
        boolean webp = read >= 12 && head[0] == 'R' && head[1] == 'I' && head[2] == 'F' && head[3] == 'F'
                && head[8] == 'W' && head[9] == 'E' && head[10] == 'B' && head[11] == 'P';
        return jpeg || png || webp;
    }
}
