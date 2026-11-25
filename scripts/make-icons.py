"""生成 HanGyeol 站点的图标集：PWA 图标 / favicon / apple-touch-icon。"""
from PIL import Image, ImageDraw, ImageFont

FONT = r"C:\Windows\Fonts\malgunbd.ttf"
OUT = r"C:\Users\LENOVO\Documents\deepseek-harness\default-workspace\hangyeol\public"

TOP = (29, 78, 216)      # #1D4ED8
BOTTOM = (59, 130, 246)  # #3B82F6
MINT = (52, 211, 153)    # #34D399
WHITE = (255, 255, 255)


def gradient(size: int) -> Image.Image:
    img = Image.new("RGB", (size, size), TOP)
    draw = ImageDraw.Draw(img)
    for y in range(size):
        t = y / max(1, size - 1)
        r = int(TOP[0] + (BOTTOM[0] - TOP[0]) * t)
        g = int(TOP[1] + (BOTTOM[1] - TOP[1]) * t)
        b = int(TOP[2] + (BOTTOM[2] - TOP[2]) * t)
        draw.line([(0, y), (size, y)], fill=(r, g, b))
    return img


def render(size: int, scale: float = 1.0, rounded: bool = False) -> Image.Image:
    """scale<1 时内容缩小（给 maskable 的 80% 安全区用）。"""
    base = gradient(size)
    draw = ImageDraw.Draw(base)

    char = "한"
    font_size = int(size * 0.58 * scale)
    font = ImageFont.truetype(FONT, font_size)
    bbox = draw.textbbox((0, 0), char, font=font)
    w = bbox[2] - bbox[0]
    h = bbox[3] - bbox[1]
    x = (size - w) / 2 - bbox[0]
    y = (size - h) / 2 - bbox[1] - int(size * 0.07)
    draw.text((x, y), char, font=font, fill=WHITE)

    # 底部薄荷色进度条
    bar_w = int(size * 0.30 * scale)
    bar_h = max(4, int(size * 0.032 * scale))
    bar_x = (size - bar_w) / 2
    bar_y = int(size * 0.80)
    draw.rounded_rectangle(
        [bar_x, bar_y, bar_x + bar_w, bar_y + bar_h],
        radius=bar_h / 2,
        fill=MINT,
    )

    if rounded:
        mask = Image.new("L", (size, size), 0)
        ImageDraw.Draw(mask).rounded_rectangle(
            [0, 0, size, size], radius=int(size * 0.22), fill=255
        )
        out = Image.new("RGBA", (size, size), (0, 0, 0, 0))
        out.paste(base, (0, 0), mask)
        return out

    return base


def save(img: Image.Image, name: str) -> None:
    path = f"{OUT}\\{name}"
    img.save(path)
    print("saved", name, img.size)


# 主图标（方图，交给系统/浏览器自己裁圆角）
save(render(512), "icon-512.png")
save(render(192), "icon-192.png")
save(render(512, scale=0.8), "icon-512-maskable.png")
save(render(180), "apple-touch-icon.png")
save(render(32), "favicon-32.png")

# favicon.ico 多尺寸
sizes = [16, 32, 48]
ico_images = [render(s).convert("RGBA") for s in sizes]
ico_images[0].save(
    f"{OUT}\\favicon.ico",
    format="ICO",
    sizes=[(s, s) for s in sizes],
    append_images=ico_images[1:],
)
print("saved favicon.ico", sizes)
