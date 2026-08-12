# App icon & splash generators

Regenerate the app icon and launch image from the source artwork in `assets/`.
Swift scripts rather than Node because they use CoreGraphics — no dependencies,
no install step, and Xcode is already required to build the iOS app at all.

```bash
# App icon → ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png
swift scripts/ios/make-app-icon.swift assets/App_Icon.png \
  ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png 150 115 955

# Launch image (run after the icon) → ios/App/App/Assets.xcassets/Splash.imageset/
swift scripts/ios/make-splash.swift \
  ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png \
  ios/App/App/Assets.xcassets/Splash.imageset/
```

```bash
# Android launcher icons + all 11 splash densities (run after the iOS icon,
# which it uses as its source so both platforms stay in sync)
swift scripts/app-assets/make-android-assets.swift \
  ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png \
  android/app/src/main/res
```

## Why the icon needs a script at all

`assets/App_Icon.png` is a **presentation mockup**, not an icon asset: the artwork
is a rounded square floating on a light-grey field with a drop shadow. Shipping it
as-is means iOS masks it a second time — a small dark square inside a grey box,
with visibly doubled corners.

`make-app-icon.swift` takes a crop rect (`x y side`, currently `150 115 955` —
re-measure if the artwork is ever re-exported) and:

1. Crops to the artwork, discarding the grey field and shadow.
2. Clamps the rounded-corner pixels to the nearest interior colour, by column then
   by row, so iOS's squircle mask can never reveal light "ears". The sample point
   steps `rimInset` px past the boundary to skip the artwork's own bright bevel —
   sampling the bevel smears pale streaks down the edges.
3. Resamples to 1024×1024 and writes it **without an alpha channel**, which iOS
   requires for app icons.

## Why the splash is generated

The stock Capacitor splash is a solid *white* 2732×2732 image and `LaunchScreen`
used `systemBackgroundColor` — both white in light mode, against an app whose
canvas is pure `#000`. Every cold start flashed full white before snapping to
black. `make-splash.swift` writes a black canvas with the icon centered, and the
storyboard now hardcodes black. `UIUserInterfaceStyle = Dark` in `Info.plist`
pins the rest (status bar text stays white and legible over the black UI).

Android had the identical problem — a solid-white `splash.png` at every density —
plus a white `ic_launcher_background`. Both now use the artwork's sampled edge
colour / black, and `AppTheme.NoActionBar` sets an explicit black
`android:windowBackground` to cover the gap between splash and first paint.

## Android adaptive icons

An adaptive icon is a 108×108dp canvas of which only the centre 72×72dp is ever
visible — the outer 18dp is always cropped, and a launcher-chosen mask (circle,
squircle, teardrop…) is applied inside that. So `make-android-assets.swift` draws
the artwork at exactly the 72/108 window and fills the remainder with the sampled
edge colour. Drawing it full-bleed instead would push the glyph's corners outside
a circular mask and clip them.

Legacy pre-API-26 icons (`ic_launcher.png` / `ic_launcher_round.png`) get no such
mask, so those are generated with their own rounded-rect and circular alpha
masks baked in.
