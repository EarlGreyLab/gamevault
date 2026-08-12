import Foundation
import CoreGraphics
import ImageIO
import UniformTypeIdentifiers

// Black launch image matching the app's #000 canvas, with the app icon centered
// and masked to iOS's ~22.37% corner radius. The stock Capacitor splash is solid
// white, which flashes hard against the pure-black UI on every cold start.

let iconPath = CommandLine.arguments[1]
let outDir = CommandLine.arguments[2]
let side = 2732
let iconSide = 700.0

guard let isrc = CGImageSourceCreateWithURL(URL(fileURLWithPath: iconPath) as CFURL, nil),
      let icon = CGImageSourceCreateImageAtIndex(isrc, 0, nil) else { exit(1) }

let cs = CGColorSpaceCreateDeviceRGB()
guard let ctx = CGContext(data: nil, width: side, height: side, bitsPerComponent: 8,
                          bytesPerRow: 0, space: cs,
                          bitmapInfo: CGImageAlphaInfo.noneSkipLast.rawValue) else { exit(1) }

ctx.setFillColor(CGColor(red: 0, green: 0, blue: 0, alpha: 1))
ctx.fill(CGRect(x: 0, y: 0, width: side, height: side))

let origin = (Double(side) - iconSide) / 2.0
let rect = CGRect(x: origin, y: origin, width: iconSide, height: iconSide)
let path = CGPath(roundedRect: rect, cornerWidth: iconSide * 0.2237,
                  cornerHeight: iconSide * 0.2237, transform: nil)
ctx.saveGState()
ctx.addPath(path)
ctx.clip()
ctx.interpolationQuality = .high
ctx.draw(icon, in: rect)
ctx.restoreGState()

guard let image = ctx.makeImage() else { exit(1) }

for name in ["splash-2732x2732.png", "splash-2732x2732-1.png", "splash-2732x2732-2.png"] {
    let url = URL(fileURLWithPath: outDir).appendingPathComponent(name)
    guard let dest = CGImageDestinationCreateWithURL(url as CFURL, UTType.png.identifier as CFString, 1, nil)
    else { exit(1) }
    CGImageDestinationAddImage(dest, image, nil)
    if !CGImageDestinationFinalize(dest) { exit(1) }
    print("wrote \(name)")
}
