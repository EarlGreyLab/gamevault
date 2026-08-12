import Foundation
import CoreGraphics
import ImageIO
import UniformTypeIdentifiers

// Generates every Android launcher icon + splash density from the 1024 iOS app
// icon, so both platforms stay derived from one source of truth. See
// scripts/ios/README.md for why the iOS icon itself has to be built first.

let iconPath = CommandLine.arguments[1]
let resDir = CommandLine.arguments[2]

guard let isrc = CGImageSourceCreateWithURL(URL(fileURLWithPath: iconPath) as CFURL, nil),
      let icon = CGImageSourceCreateImageAtIndex(isrc, 0, nil) else { exit(1) }

let cs = CGColorSpaceCreateDeviceRGB()

// Sample the artwork's own edge colour — used as the adaptive-icon background and
// as the fill behind the inset foreground, so neither shows a seam.
func sampleEdge() -> CGColor {
    var px = [UInt8](repeating: 0, count: 4)
    guard let c = CGContext(data: &px, width: 1, height: 1, bitsPerComponent: 8,
                            bytesPerRow: 4, space: cs,
                            bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue)
    else { return CGColor(red: 0, green: 0, blue: 0, alpha: 1) }
    // 6% in from the left edge at mid-height: past the bevel, still edge-toned.
    let w = icon.width, h = icon.height
    let s = max(1, w / 16)
    c.draw(icon, in: CGRect(x: -CGFloat(s), y: -CGFloat(h / 2), width: CGFloat(w), height: CGFloat(h)))
    return CGColor(red: CGFloat(px[0]) / 255, green: CGFloat(px[1]) / 255,
                   blue: CGFloat(px[2]) / 255, alpha: 1)
}
let bg = sampleEdge()
let comps = bg.components ?? [0, 0, 0, 1]
let hex = String(format: "#%02X%02X%02X", Int(comps[0] * 255), Int(comps[1] * 255), Int(comps[2] * 255))
print("sampled adaptive-icon background: \(hex)")

func write(_ image: CGImage, _ path: String) {
    let url = URL(fileURLWithPath: path)
    try? FileManager.default.createDirectory(at: url.deletingLastPathComponent(),
                                             withIntermediateDirectories: true)
    guard let dest = CGImageDestinationCreateWithURL(url as CFURL, UTType.png.identifier as CFString, 1, nil)
    else { exit(1) }
    CGImageDestinationAddImage(dest, image, nil)
    if !CGImageDestinationFinalize(dest) { exit(1) }
}

func newContext(_ w: Int, _ h: Int, opaque: Bool) -> CGContext {
    let info = opaque ? CGImageAlphaInfo.noneSkipLast.rawValue
                      : CGImageAlphaInfo.premultipliedLast.rawValue
    guard let c = CGContext(data: nil, width: w, height: h, bitsPerComponent: 8,
                            bytesPerRow: 0, space: cs, bitmapInfo: info) else { exit(1) }
    c.interpolationQuality = .high
    return c
}

// ── Legacy launcher icons (pre-API-26): drawn with their own mask + alpha ──────
let legacy = [("mdpi", 48), ("hdpi", 72), ("xhdpi", 96), ("xxhdpi", 144), ("xxxhdpi", 192)]
for (density, size) in legacy {
    for (name, circular) in [("ic_launcher", false), ("ic_launcher_round", true)] {
        let ctx = newContext(size, size, opaque: false)
        let rect = CGRect(x: 0, y: 0, width: size, height: size)
        let path = circular
            ? CGPath(ellipseIn: rect, transform: nil)
            : CGPath(roundedRect: rect, cornerWidth: Double(size) * 0.2237,
                     cornerHeight: Double(size) * 0.2237, transform: nil)
        ctx.addPath(path)
        ctx.clip()
        ctx.draw(icon, in: rect)
        guard let img = ctx.makeImage() else { exit(1) }
        write(img, "\(resDir)/mipmap-\(density)/\(name).png")
    }
}
print("wrote \(legacy.count * 2) legacy launcher icons")

// ── Adaptive foregrounds (API 26+) ────────────────────────────────────────────
// The outer 18/108 of an adaptive icon is always cropped, so the artwork is drawn
// at exactly the 72/108 visible window and the rest filled with the edge colour.
// That makes the masked result match the iOS icon instead of clipping the glyph.
let adaptive = [("mdpi", 108), ("hdpi", 162), ("xhdpi", 216), ("xxhdpi", 324), ("xxxhdpi", 432)]
for (density, size) in adaptive {
    let ctx = newContext(size, size, opaque: true)
    ctx.setFillColor(bg)
    ctx.fill(CGRect(x: 0, y: 0, width: size, height: size))
    let inner = Double(size) * 72.0 / 108.0
    let origin = (Double(size) - inner) / 2.0
    ctx.draw(icon, in: CGRect(x: origin, y: origin, width: inner, height: inner))
    guard let img = ctx.makeImage() else { exit(1) }
    write(img, "\(resDir)/mipmap-\(density)/ic_launcher_foreground.png")
}
print("wrote \(adaptive.count) adaptive foregrounds")

// ── Splash screens: black canvas, icon centred ────────────────────────────────
// Replaces Capacitor's solid-white default, which flashes against the #000 UI.
let splashes: [(String, Int, Int)] = [
    ("drawable", 480, 320),
    ("drawable-port-mdpi", 320, 480), ("drawable-port-hdpi", 480, 800),
    ("drawable-port-xhdpi", 720, 1280), ("drawable-port-xxhdpi", 960, 1600),
    ("drawable-port-xxxhdpi", 1280, 1920),
    ("drawable-land-mdpi", 480, 320), ("drawable-land-hdpi", 800, 480),
    ("drawable-land-xhdpi", 1280, 720), ("drawable-land-xxhdpi", 1600, 960),
    ("drawable-land-xxxhdpi", 1920, 1280),
]
for (dir, w, h) in splashes {
    let ctx = newContext(w, h, opaque: true)
    ctx.setFillColor(CGColor(red: 0, green: 0, blue: 0, alpha: 1))
    ctx.fill(CGRect(x: 0, y: 0, width: w, height: h))
    let side = Double(min(w, h)) * 0.38
    let rect = CGRect(x: (Double(w) - side) / 2, y: (Double(h) - side) / 2, width: side, height: side)
    ctx.saveGState()
    ctx.addPath(CGPath(roundedRect: rect, cornerWidth: side * 0.2237,
                       cornerHeight: side * 0.2237, transform: nil))
    ctx.clip()
    ctx.draw(icon, in: rect)
    ctx.restoreGState()
    guard let img = ctx.makeImage() else { exit(1) }
    write(img, "\(resDir)/\(dir)/splash.png")
}
print("wrote \(splashes.count) splash images")
