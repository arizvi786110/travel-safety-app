import { WebView } from "react-native-webview";
import { StyleSheet, View } from "react-native";

export type TappedCountry = {
  name: string;
  admin: string;
  iso2: string;
  iso3: string;
};

type Props = {
  onCountryPress?: (country: TappedCountry) => void;
  onInteractionChange?: (active: boolean) => void;
  height?: number;
};

const HTML = `<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
<style>
  html, body { margin: 0; height: 100%; background: transparent; overflow: hidden; }
  #globe { width: 100%; height: 100%; background: transparent; }
  #status { position: absolute; top: 8px; left: 10px; color: rgba(244,238,240,0.6); font: 12px sans-serif; }
</style>
<script src="https://cdn.jsdelivr.net/npm/globe.gl"></script>
</head>
<body>
<div id="globe"></div>
<div id="status">Loading map...</div>
<script>
  var COUNTRIES_URL = "https://cdn.jsdelivr.net/gh/vasturiano/globe.gl/example/datasets/ne_110m_admin_0_countries.geojson";

  // Tweak the look here
  var SPHERE_COLOR = "#25212d";
  var LAND_COLOR = "rgba(232,201,210,0.20)";
  var BORDER_COLOR = "rgba(15,12,18,0.75)";
  var SELECTED_COLOR = "rgba(232,201,210,0.95)";

  var statusEl = document.getElementById("status");
  var selected = null;

  function send(msg) {
    window.ReactNativeWebView.postMessage(JSON.stringify(msg));
  }

  window.onerror = function (message) {
    statusEl.textContent = "Map error";
    send({ type: "error", message: String(message) });
  };

  try {
    var el = document.getElementById("globe");
    var globe = new Globe(el)
      .width(window.innerWidth)
      .height(window.innerHeight)
      .backgroundColor("rgba(0,0,0,0)")
      .showAtmosphere(false)
      .polygonStrokeColor(function () { return BORDER_COLOR; })
      .polygonSideColor(function () { return "rgba(0,0,0,0)"; })
      .polygonsTransitionDuration(300)
      .polygonLabel(function (d) { return d.properties.NAME; });

    // Without a texture the globe is a plain sphere, so tint it dark charcoal
    try {
      globe.globeMaterial().color.set(SPHERE_COLOR);
    } catch (e) {}

    // Re-applying the accessors makes globe.gl redraw the selected country
    function applyStyles() {
      globe
        .polygonCapColor(function (d) {
          return d === selected ? SELECTED_COLOR : LAND_COLOR;
        })
        .polygonAltitude(function (d) {
          return d === selected ? 0.04 : 0.01;
        });
    }
    applyStyles();

    globe.onPolygonClick(function (polygon, event, coords) {
      selected = polygon;
      applyStyles();
      if (coords) {
        globe.pointOfView({ lat: coords.lat, lng: coords.lng, altitude: 2 }, 700);
      }
      var p = polygon.properties;
      send({
        type: "country",
        name: p.NAME,
        admin: p.ADMIN,
        iso2: p.ISO_A2,
        iso3: p.ISO_A3_EH || p.ISO_A3
      });
    });

    globe.pointOfView({ lat: 20, lng: 0, altitude: 2.2 });
    globe.controls().autoRotate = true;
    globe.controls().autoRotateSpeed = 0.4;
    // Zooming in would push the globe past the edges of the view and cut it off
    globe.controls().enableZoom = false;

    // Tell React Native when a finger is on the globe so the page doesn't scroll
    el.addEventListener("touchstart", function () {
      globe.controls().autoRotate = false;
      send({ type: "interaction", active: true });
    }, { passive: true });
    el.addEventListener("touchend", function () {
      send({ type: "interaction", active: false });
    }, { passive: true });
    el.addEventListener("touchcancel", function () {
      send({ type: "interaction", active: false });
    }, { passive: true });

    window.addEventListener("resize", function () {
      globe.width(window.innerWidth).height(window.innerHeight);
    });

    fetch(COUNTRIES_URL)
      .then(function (r) { return r.json(); })
      .then(function (data) {
        var features = data.features.filter(function (f) { return f.properties.ISO_A2 !== "AQ"; });
        globe.polygonsData(features);
        statusEl.textContent = "";
        send({ type: "ready", count: features.length });
      })
      .catch(function (err) {
        statusEl.textContent = "Map failed to load";
        send({ type: "error", message: String(err) });
      });
  } catch (err) {
    statusEl.textContent = "Globe failed to start";
    send({ type: "error", message: String(err) });
  }
</script>
</body>
</html>`;

export default function GlobeExplorer({
  onCountryPress,
  onInteractionChange,
  height = 280,
}: Props) {
  return (
    <View style={[styles.wrapper, { height }]}>
      <WebView
        originWhitelist={["*"]}
        source={{ html: HTML }}
        javaScriptEnabled
        domStorageEnabled
        scrollEnabled={false}
        nestedScrollEnabled
        overScrollMode="never"
        style={styles.webview}
        containerStyle={styles.webview}
        onMessage={(event) => {
          try {
            const msg = JSON.parse(event.nativeEvent.data);
            if (msg.type === "country") {
              console.log("Country tapped:", JSON.stringify(msg));
              onCountryPress?.(msg);
            } else if (msg.type === "interaction") {
              onInteractionChange?.(msg.active);
            } else if (msg.type === "ready") {
              console.log("Globe ready, countries:", msg.count);
            } else if (msg.type === "error") {
              console.log("Globe error:", msg.message);
            }
          } catch {
          }
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { backgroundColor: "transparent" },
  webview: { flex: 1, backgroundColor: "transparent" },
});