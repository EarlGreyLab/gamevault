import Foundation
import CoreGraphics
import ImageIO
import UniformTypeIdentifiers

// Crop the icon artwork out of the mockup, clamp the light rounded-corner
// pixels to the nearest dark pixel on their row (so iOS's own squircle mask
// never reveals light "ears"), and emit a flat 1024x1024 opaque PNG.

let srcPath = CommandLine.arguments[1]
let dstPath = CommandLine.arguments[2]
let cx = Int(CommandLine.arguments[3])!, cy = Int(CommandLine.arguments[4])!
let side = Int(CommandLine.arguments[5])!

guard let isrc = CGImageSourceCreateWithURL(URL(fileURLWithPath: srcPath) as CFURL, nil),
      let img = CGImageSourceCreateImageAtIndex(isrc, 0, nil) else { exit(1) }

let w = img.width, h = img.height
var buf = [UInt8](repeating: 0, count: w * h * 4)
let cs = CGColorSpaceCreateDeviceRGB()
guard let ctx = CGContext(data: &buf, width: w, height: h, bitsPerComponent: 8,
                          bytesPerRow: w * 4, space: cs,
                          bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue) else { exit(1) }
ctx.draw(img, in: CGRect(x: 0, y: 0, width: w, height: h))

func lum(_ p: [UInt8], _ i: Int) -> Int {
    (Int(p[i]) * 299 + Int(p[i+1]) * 587 + Int(p[i+2]) * 114) / 1000
}

// Extract the crop
var crop = [UInt8](repeating: 0, count: side * side * 4)
for y in 0..<side {
    for x in 0..<side {
        let si = ((cy + y) * w + (cx + x)) * 4
        let di = (y * side + x) * 4
        crop[di] = buf[si]; crop[di+1] = buf[si+1]
        crop[di+2] = buf[si+2]; crop[di+3] = 255
    }
}

// Edge-clamp: on each row, find the first/last sufficiently dark pixel and
// smear it outward over the light corner pixels. Preserves the gradient.
// `rimInset` steps past the artwork's own bright bevel highlight, which sits
// right at the boundary — sampling it would smear pale streaks down the edges.
let darkThr = 170
let rimInset = 14
var clamped = 0

// Columns first (fixes the top/bottom rim, which iOS's squircle mask exposes at
// the edge midpoints), then rows (fixes left/right plus all four corners).
func clampLine(count: Int, index: (Int) -> Int) {
    var first = -1, last = -1
    for i in 0..<count where lum(crop, index(i) * 4) < darkThr {
        if first < 0 { first = i }
        last = i
    }
    guard first >= 0, last - first > rimInset * 2 else { return }
    first += rimInset
    last -= rimInset
    for i in 0..<first {
        let di = index(i) * 4, si = index(first) * 4
        crop[di] = crop[si]; crop[di+1] = crop[si+1]; crop[di+2] = crop[si+2]
        clamped += 1
    }
    for i in (last + 1)..<count {
        let di = index(i) * 4, si = index(last) * 4
        crop[di] = crop[si]; crop[di+1] = crop[si+1]; crop[di+2] = crop[si+2]
        clamped += 1
    }
}

for x in 0..<side { clampLine(count: side) { $0 * side + x } }
for y in 0..<side { clampLine(count: side) { y * side + $0 } }
print("clamped \(clamped) corner px (\(clamped * 100 / (side * side))% of area)")

guard let cropCtx = CGContext(data: &crop, width: side, height: side, bitsPerComponent: 8,
                              bytesPerRow: side * 4, space: cs,
                              bitmapInfo: CGImageAlphaInfo.noneSkipLast.rawValue),
      let cropped = cropCtx.makeImage() else { exit(1) }

// Resample to 1024, opaque, no alpha channel
guard let out = CGContext(data: nil, width: 1024, height: 1024, bitsPerComponent: 8,
                          bytesPerRow: 0, space: cs,
                          bitmapInfo: CGImageAlphaInfo.noneSkipLast.rawValue) else { exit(1) }
out.interpolationQuality = .high
out.draw(cropped, in: CGRect(x: 0, y: 0, width: 1024, height: 1024))
guard let final = out.makeImage() else { exit(1) }

guard let dest = CGImageDestinationCreateWithURL(
        URL(fileURLWithPath: dstPath) as CFURL, UTType.png.identifier as CFString, 1, nil)
else { exit(1) }
CGImageDestinationAddImage(dest, final, nil)
if !CGImageDestinationFinalize(dest) { exit(1) }
print("wrote \(dstPath)")
