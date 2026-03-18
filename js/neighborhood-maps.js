/**
 * Interactive Neighborhood Maps — OKC Welcome Guide
 * Van Horn Homes | ccvanhorn.com
 *
 * Uses Mapbox GL JS to render two interactive maps:
 *   1. Urban Core (17 neighborhoods)
 *   2. North OKC (6 neighborhoods)
 *
 * Each map features:
 *   - Custom brand-styled base tiles
 *   - Polygon overlays per neighborhood
 *   - Hover highlighting
 *   - Click-to-show-description popups
 *   - Numbered labels
 */
(function () {
  'use strict';

  mapboxgl.accessToken =
    'pk.eyJ1IjoidmFuaDQzNTciLCJhIjoiY201eGp4bWJuMGFhZjJxb205bnl0bHFxMCJ9.1PPTqrCDe1qBw5Q2FF0rNA';

  // ── Brand palette ────────────────────────────────────────────────────
  var C = {
    cream:    '#EFEDE7',
    charcoal: '#65696E',
    apricot:  '#CFAE9B',
    mist:     '#DDE3E8',
    nude:     '#E7D6C9',
    sage:     '#D5DED0'
  };

  // ── Cross-map registry ──────────────────────────────────────────────
  var mapRegistry = {};

  // ── Neighborhood Info Drawer (singleton) ──────────────────────────
  var HoodDrawer = (function () {
    var drawerEl, bodyEl, backdropEl, closeBtn;
    var isOpen = false;
    var activeMapId = null;
    var swapTimer = null;

    function init() {
      drawerEl   = document.getElementById('hoodDrawer');
      bodyEl     = document.getElementById('hoodDrawerBody');
      backdropEl = document.getElementById('hoodDrawerBackdrop');
      closeBtn   = document.getElementById('hoodDrawerClose');

      if (!drawerEl) return;

      closeBtn.addEventListener('click', function () { close(); });
      backdropEl.addEventListener('click', function () { close(); });

      document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && isOpen) close();
      });

      // Auto-close when both map sections scroll out of view
      var urbanSection = document.getElementById('neighborhoods-urban');
      var northSection = document.getElementById('neighborhoods-north');
      var visible = { urban: false, north: false };

      var scrollObserver = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.target.id === 'neighborhoods-urban') visible.urban = entry.isIntersecting;
          if (entry.target.id === 'neighborhoods-north') visible.north = entry.isIntersecting;
        });
        if (isOpen && !visible.urban && !visible.north) close();
      }, { threshold: 0 });

      if (urbanSection) scrollObserver.observe(urbanSection);
      if (northSection) scrollObserver.observe(northSection);
    }

    function open(mapId, data) {
      // Clear selection on any other map
      Object.keys(mapRegistry).forEach(function (id) {
        if (id !== mapId && mapRegistry[id].clearSelection) {
          mapRegistry[id].clearSelection();
        }
      });

      activeMapId = mapId;

      if (isOpen) {
        // Swap content with crossfade
        bodyEl.classList.add('swapping');
        clearTimeout(swapTimer);
        swapTimer = setTimeout(function () {
          renderContent(data);
          bodyEl.classList.remove('swapping');
        }, 150);
      } else {
        renderContent(data);
        drawerEl.classList.add('open');
        backdropEl.classList.add('open');
        isOpen = true;
      }
    }

    function close(skipMapCleanup) {
      if (!isOpen) return;
      drawerEl.classList.remove('open');
      backdropEl.classList.remove('open');
      isOpen = false;
      if (!skipMapCleanup && activeMapId && mapRegistry[activeMapId] && mapRegistry[activeMapId].clearSelection) {
        mapRegistry[activeMapId].clearSelection();
      }
      activeMapId = null;
    }

    function renderContent(d) {
      bodyEl.innerHTML =
        '<h4><span class="hood-drawer-num">' + d.num + '.</span> ' + d.name + '</h4>' +
        '<p class="hood-drawer-group">' + d.group + '</p>' +
        '<p>' + d.desc + '</p>';
    }

    return { init: init, open: open, close: close };
  })();

  // ── Helper: build a GeoJSON Feature ──────────────────────────────────
  function F(id, name, num, desc, group, ring) {
    ring.push([ring[0][0], ring[0][1]]);
    return {
      type: 'Feature',
      id: id,
      properties: { name: name, num: String(num), desc: desc, group: group },
      geometry: { type: 'Polygon', coordinates: [ring] }
    };
  }

  // ── Urban Core data (21 neighborhoods) ───────────────────────────────
  // Boundaries sourced from Google My Maps KML (OK CITY METRO.kml).
  var urbanCoreData = {
    type: 'FeatureCollection',
    features: [
      // --- The Historic Heart ---
      F(0, 'Heritage Hills', 1,
        'Architecturally significant and beaming with history. One of OKC\u2019s most iconic historic neighborhoods with a strong sense of community.',
        'The Historic Heart',
        [[-97.5159334,35.4916791],[-97.5209974,35.4916791],[-97.5210618,35.4853544],[-97.5291728,35.4853369],[-97.5299882,35.4860882],[-97.5298191,35.4829439],[-97.5267721,35.482909],[-97.5267721,35.4837826],[-97.5254417,35.4837651],[-97.5254417,35.482874],[-97.5175238,35.4827867],[-97.5175238,35.4846562],[-97.5160003,35.4846388]]),

      F(1, 'Mesta Park', 2,
        'A charming historic community with modern amenities, preserving the past while improving the future.',
        'The Historic Heart',
        [[-97.5159334,35.493199],[-97.5299452,35.4932165],[-97.5299882,35.4860882],[-97.5291728,35.4853369],[-97.5210618,35.4853544],[-97.5209974,35.4916791],[-97.5159334,35.4916791]]),

      F(2, 'Jefferson Park', 3,
        'A quiet, entirely residential neighborhood with no through traffic \u2014 a rare urban retreat with tree-lined streets and a strong sense of community.',
        'The Historic Heart',
        [[-97.5210201,35.4931757],[-97.5139391,35.4932455],[-97.5142395,35.5006876],[-97.5209987,35.5005304]]),

      F(3, 'Edgemere Park', 4,
        'Winding streets and lush tree canopy create a park-like setting in the heart of the Urban Core \u2014 one of OKC\u2019s most unique residential enclaves.',
        'The Historic Heart',
        [[-97.5209924,35.5076975],[-97.5209987,35.5005304],[-97.515585,35.5006753],[-97.5152632,35.5018108],[-97.5154134,35.5031558],[-97.5153061,35.5043087],[-97.5149199,35.5052695],[-97.5146624,35.5061953],[-97.5148984,35.5071036],[-97.5152203,35.5078023]]),

      F(4, 'Crown Heights', 5,
        'Charming architecture and close proximity to Western Ave \u2014 something for everyone.',
        'The Historic Heart',
        [[-97.5298443,35.5149689],[-97.5298229,35.5077377],[-97.5209924,35.5076975],[-97.5209608,35.5150387]]),

      F(5, 'Putnam Heights', 6,
        'Historic charm, oversized lots, and proximity to amazing amenities across the city.',
        'The Historic Heart',
        [[-97.5343647,35.5102321],[-97.5403943,35.5101622],[-97.5391283,35.5077343],[-97.5386991,35.5077343],[-97.5387206,35.506529],[-97.5343861,35.5065116]]),

      // --- Midtown & Downtown ---
      F(6, 'SOSA', 7,
        'Quickly becoming one of the most desirable addresses in Midtown, SOSA is where modern architecture meets neighborhood charm \u2014 a perfect blend of urban energy and residential calm.',
        'Midtown & Downtown',
        [[-97.5299,35.4826],[-97.5140,35.4825],[-97.5140,35.4720],[-97.5296,35.4720]]),

      F(7, 'Midtown', 8,
        'The beating heart of OKC\u2019s social scene. Restaurants, rooftop bars, and shops \u2014 Midtown keeps you in the middle of it all with no shortage of places to call home.',
        'Midtown & Downtown',
        [[-97.5140,35.4825],[-97.5034,35.4824],[-97.5029,35.4716],[-97.5140,35.4720]]),

      F(8, 'Deep Deuce', 9,
        'Once the epicenter of OKC\u2019s jazz and blues scene, Deep Deuce is now one of downtown\u2019s most vibrant residential communities. The Hill at Bricktown offers townhomes for those looking to own.',
        'Midtown & Downtown',
        [[-97.5140,35.4720],[-97.5029,35.4716],[-97.5009,35.4670],[-97.5140,35.4670]]),

      F(9, 'Bricktown', 10,
        'OKC\u2019s premier entertainment district \u2014 45+ restaurants, bars, and shops along the historic brick streets and canal. Comedy, baseball, concerts, and dining on the water.',
        'Midtown & Downtown',
        [[-97.5140,35.4670],[-97.5009,35.4670],[-97.5009,35.4648],[-97.5036,35.4625],[-97.5140,35.4625]]),

      F(10, 'Film Row', 11,
        'The creative soul of downtown. Tucked along West Main Street with acclaimed cocktail bars, restaurants, and local breweries \u2014 more intimate and artsy than its neighbors.',
        'Midtown & Downtown',
        [[-97.5296,35.4720],[-97.5140,35.4720],[-97.5140,35.4625],[-97.5209,35.4623],[-97.5240,35.4629],[-97.5294,35.4651]]),

      // --- The Up & Coming ---
      F(11, 'Lincoln Terrace', 12,
        'A historic preservation district near downtown with great views of the skyline and Oklahoma State Capitol.',
        'The Up & Coming',
        [[-97.5088891,35.4911956],[-97.5088677,35.4835429],[-97.4988255,35.4835255],[-97.4988469,35.4854649],[-97.5008211,35.4854824],[-97.5007996,35.4874217],[-97.4987182,35.4875091],[-97.498332,35.4884351],[-97.4987826,35.4893436],[-97.4988469,35.4907238],[-97.4988469,35.4911781]]),

      F(12, 'The Paseo', 13,
        'OKC\u2019s original art district \u2014 galleries, festivals, great food, and live music just a short walk away.',
        'The Up & Coming',
        [[-97.5297749,35.5005828],[-97.5299452,35.4932165],[-97.5210201,35.4931757],[-97.5209987,35.5005304]]),

      F(13, 'The Plaza / Classen-Ten-Penn', 14,
        'Vibrant, evolving neighborhood with easy access to downtown and the Plaza District right across the street.',
        'The Up & Coming',
        [[-97.5302613,35.4859053],[-97.5477278,35.4858703],[-97.5477278,35.4787065],[-97.5300467,35.4787414]]),

      F(14, 'Wheeler District', 15,
        'Skyline views, bike trails along the Oklahoma River, restaurants, shopping, and the new West Gate Elementary.',
        'The Up & Coming',
        [[-97.5334844,35.4541346],[-97.5344929,35.4540997],[-97.53445,35.4497647],[-97.5343641,35.4451149],[-97.5302228,35.44508],[-97.5302228,35.449083],[-97.5320038,35.4490481],[-97.5310811,35.4521769]]),

      // --- The Woods ---
      F(15, 'Gatewood', 16,
        'Historic charm meets modern builds \u2014 eclectic, convenient, and steps from the Plaza.',
        'The Woods',
        [[-97.5318062,35.4932083],[-97.5476849,35.4931384],[-97.5477278,35.4858703],[-97.5302613,35.4859053],[-97.5312054,35.4874428],[-97.5311625,35.4918805]]),

      F(16, 'Crestwood', 17,
        'A picturesque neighborhood in the heart of OKC with character, charm, and quick downtown access.',
        'The Woods',
        [[-97.5566113,35.4930685],[-97.5656235,35.4930685],[-97.5656235,35.4859402],[-97.5566971,35.4859402]]),

      F(17, 'Linwood', 18,
        'Historic homes in colonial revival, craftsman, and tudor styles \u2014 thoughtfully renovated and restored.',
        'The Woods',
        [[-97.5782745,35.4931845],[-97.5793903,35.4893933],[-97.5795405,35.4874714],[-97.5788968,35.4859689],[-97.5701635,35.4859164],[-97.5701635,35.493167]]),

      // --- The West Edge ---
      F(18, 'Cleveland', 19,
        'A friendly, diverse neighborhood in the urban core with many home styles and great schools.',
        'The West Edge',
        [[-97.5656725,35.5003299],[-97.5656235,35.4930685],[-97.5566113,35.4930685],[-97.5566603,35.5003823]]),

      F(19, 'Shepherd', 20,
        'Old-world charm with manicured lawns and beautifully remodeled tudor-style homes.',
        'The West Edge',
        [[-97.556553,35.5012732],[-97.5566113,35.4930685],[-97.5476849,35.4931384],[-97.5477125,35.5009937],[-97.5521327,35.5009239],[-97.5521435,35.5013431]]),

      F(20, 'Venice', 21,
        'A friendly community with a unique blend of home styles on the winding boulevard.',
        'The West Edge',
        [[-97.5656015,35.5075127],[-97.5656725,35.5003299],[-97.5566603,35.5003823],[-97.5566751,35.5077223]])
    ]
  };

  // ── North OKC data (6 neighborhoods) ─────────────────────────────────
  var northOkcData = {
    type: 'FeatureCollection',
    features: [
      F(0, 'Zachary Taylor', 22,
        'Easy commute with Western Avenue access, major highways, and popular dining destinations.',
        'North OKC',
        [[-97.5269342,35.5225107],[-97.5177074,35.5225107],[-97.5191236,35.5282387],[-97.5269771,35.5269116]]),

      F(1, 'Belle Isle', 23,
        'Central location with easy access to dining, retail, and seamless commuting \u2014 a perfect balance of convenience and neighborhood charm.',
        'North OKC',
        [[-97.556401,35.5365547],[-97.5564868,35.5260774],[-97.5500924,35.5250296],[-97.5497062,35.5258678],[-97.5474317,35.5254138],[-97.5475604,35.5368341]]),

      F(2, 'Glenbrook', 24,
        'A friendly community with tree-lined streets and quick access to restaurants, coffee shops, and parks.',
        'North OKC',
        [[-97.5475604,35.5368341],[-97.5474902,35.5330275],[-97.5313111,35.5330973],[-97.5337144,35.5367642]]),

      F(3, 'Nichols Hills', 25,
        'Luxury living with upscale homes, manicured streets, and beautiful parks \u2014 one of OKC\u2019s most sought-after areas.',
        'North OKC',
        [[-97.5296088,35.5368399],[-97.5296733,35.5510947],[-97.540209,35.5510947],[-97.5403807,35.5587932],[-97.5469253,35.5588281],[-97.5580189,35.5588805],[-97.5582333,35.5563415],[-97.5580188,35.5546132],[-97.5583192,35.5524834],[-97.5566455,35.5519946],[-97.5566025,35.5497251],[-97.5586625,35.5467921],[-97.5552293,35.545535],[-97.55686,35.5409257],[-97.5568171,35.5366304]]),

      F(4, 'The Village', 26,
        'The perfect mix of city life and affordability \u2014 restaurants, coffee shops, and parks.',
        'North OKC',
        [[-97.5580189,35.5588805],[-97.5403807,35.5587932],[-97.5407069,35.5800348],[-97.5758975,35.5802093],[-97.5752753,35.5730189],[-97.5730866,35.5656883],[-97.5627688,35.5655267],[-97.5625542,35.5593126],[-97.5642279,35.5588936],[-97.5640133,35.5578113],[-97.5582627,35.5574622]]),

      F(5, 'Quail Creek', 27,
        'Wonderfully established with homes from Mid-Century Modern to Contemporary. Active HOA with community events year-round.',
        'North OKC',
        [[-97.5672715,35.6088945],[-97.5834935,35.6088248],[-97.5845235,35.6015672],[-97.5843518,35.5934714],[-97.5829786,35.58705],[-97.5794595,35.5804187],[-97.5672715,35.5801395]])
    ]
  };

  // ── Compute polygon centroid ─────────────────────────────────────────
  function centroid(ring) {
    var lng = 0, lat = 0, n = ring.length - 1;
    for (var i = 0; i < n; i++) { lng += ring[i][0]; lat += ring[i][1]; }
    return [lng / n, lat / n];
  }

  // ── Customize the Mapbox Light style to match brand palette ──────────
  function brandifyStyle(map) {
    var style = map.getStyle();
    if (!style || !style.layers) return;

    style.layers.forEach(function (layer) {
      try {
        var id = layer.id;

        if (id === 'background') {
          map.setPaintProperty(id, 'background-color', C.cream);
          return;
        }
        if (id.indexOf('water') !== -1 && layer.type === 'fill') {
          map.setPaintProperty(id, 'fill-color', C.mist);
          return;
        }
        if ((id.indexOf('landuse') !== -1 || id.indexOf('park') !== -1 || id.indexOf('pitch') !== -1) && layer.type === 'fill') {
          map.setPaintProperty(id, 'fill-color', C.sage);
          return;
        }
        if (id.indexOf('building') !== -1 && layer.type === 'fill') {
          map.setPaintProperty(id, 'fill-color', C.nude);
          map.setPaintProperty(id, 'fill-opacity', 0.5);
          return;
        }
        if ((id.indexOf('road') !== -1 || id.indexOf('bridge') !== -1 || id.indexOf('tunnel') !== -1) && layer.type === 'line') {
          var current = map.getPaintProperty(id, 'line-color');
          if (typeof current === 'string') {
            map.setPaintProperty(id, 'line-color', '#E2DED6');
          }
          return;
        }
        if (layer.type === 'symbol') {
          map.setPaintProperty(id, 'text-color', C.charcoal);
        }
      } catch (e) { /* skip layers that don't support the property */ }
    });
  }

  // ── Build label points from polygon centroids ────────────────────────
  function makeLabelData(geojson) {
    return {
      type: 'FeatureCollection',
      features: geojson.features.map(function (f) {
        return {
          type: 'Feature',
          properties: { num: f.properties.num, name: f.properties.name },
          geometry: { type: 'Point', coordinates: centroid(f.geometry.coordinates[0]) }
        };
      })
    };
  }

  // ── Initialize a single neighborhood map ─────────────────────────────
  function initNeighborhoodMap(containerId, geojson) {
    var map = new mapboxgl.Map({
      container: containerId,
      style: 'mapbox://styles/mapbox/light-v11',
      dragRotate: false,
      pitchWithRotate: false,
      touchPitch: false,
      attributionControl: false
    });

    map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), 'top-right');
    map.addControl(new mapboxgl.AttributionControl({ compact: true }));

    map.on('load', function () {
      brandifyStyle(map);

      // Fit map to neighborhood bounds
      var bounds = new mapboxgl.LngLatBounds();
      geojson.features.forEach(function (f) {
        f.geometry.coordinates[0].forEach(function (c) { bounds.extend(c); });
      });
      map.fitBounds(bounds, { padding: { top: 50, bottom: 50, left: 40, right: 40 }, duration: 0 });

      // Lock min zoom to initial fitBounds level — users can zoom in but not out past this
      var initialZoom = map.getZoom();
      map.setMinZoom(initialZoom);

      // Constrain panning to a slightly padded version of the neighborhood area
      var sw = bounds.getSouthWest();
      var ne = bounds.getNorthEast();
      var lngPad = (ne.lng - sw.lng) * 0.15;
      var latPad = (ne.lat - sw.lat) * 0.15;
      map.setMaxBounds([
        [sw.lng - lngPad, sw.lat - latPad],
        [ne.lng + lngPad, ne.lat + latPad]
      ]);

      // Neighborhood polygons
      map.addSource('neighborhoods', { type: 'geojson', data: geojson, promoteId: 'num' });

      map.addLayer({
        id: 'hood-fill',
        type: 'fill',
        source: 'neighborhoods',
        paint: {
          'fill-color': C.apricot,
          'fill-opacity': [
            'case',
            ['boolean', ['feature-state', 'hover'], false],
            0.45,
            0.18
          ]
        }
      });

      map.addLayer({
        id: 'hood-outline',
        type: 'line',
        source: 'neighborhoods',
        paint: {
          'line-color': C.charcoal,
          'line-width': [
            'case',
            ['boolean', ['feature-state', 'hover'], false],
            2.5,
            1.2
          ],
          'line-opacity': 0.65
        }
      });

      // Number labels at polygon centroids
      map.addSource('hood-labels', { type: 'geojson', data: makeLabelData(geojson) });

      map.addLayer({
        id: 'hood-numbers',
        type: 'symbol',
        source: 'hood-labels',
        layout: {
          'text-field': ['get', 'num'],
          'text-size': 13,
          'text-font': ['DIN Pro Medium', 'Arial Unicode MS Regular'],
          'text-allow-overlap': true,
          'text-ignore-placement': true
        },
        paint: {
          'text-color': C.charcoal,
          'text-halo-color': 'rgba(255,255,255,0.92)',
          'text-halo-width': 2
        }
      });

      // ── Interaction state ──────────────────────────────────────────────
      var hoveredNum = null;
      var selectedNum = null;

      // Build a lookup: num → { properties, centroid }
      var featureLookup = {};
      geojson.features.forEach(function (f) {
        featureLookup[f.properties.num] = {
          properties: f.properties,
          centroid: centroid(f.geometry.coordinates[0])
        };
      });

      function clearSelection() {
        if (selectedNum !== null) {
          map.setFeatureState({ source: 'neighborhoods', id: selectedNum }, { hover: false });
          var prev = document.querySelector('.hood-list-item.active[data-hood="' + selectedNum + '"]');
          if (prev) prev.classList.remove('active');
          selectedNum = null;
        }
      }

      function selectNeighborhood(num, lngLat) {
        var info = featureLookup[num];
        if (!info) return;

        // If clicking the same one, toggle off
        if (selectedNum === num) {
          clearSelection();
          HoodDrawer.close(true);
          return;
        }

        clearSelection();
        selectedNum = num;

        // Highlight polygon
        map.setFeatureState({ source: 'neighborhoods', id: num }, { hover: true });

        // Highlight list item
        var listItem = document.querySelector('.hood-list-item[data-hood="' + num + '"]');
        if (listItem) listItem.classList.add('active');

        // Open (or swap content in) the external drawer
        var p = info.properties;
        HoodDrawer.open(containerId, {
          num: p.num,
          name: p.name,
          group: p.group,
          desc: p.desc
        });
      }

      // Register with cross-map registry
      mapRegistry[containerId] = { clearSelection: clearSelection };

      // Hover interaction (skip hover highlight on the selected polygon)
      map.on('mousemove', 'hood-fill', function (e) {
        if (e.features.length > 0) {
          var num = e.features[0].properties.num;
          if (hoveredNum !== null && hoveredNum !== selectedNum) {
            map.setFeatureState({ source: 'neighborhoods', id: hoveredNum }, { hover: false });
          }
          hoveredNum = num;
          if (num !== selectedNum) {
            map.setFeatureState({ source: 'neighborhoods', id: num }, { hover: true });
          }
          map.getCanvas().style.cursor = 'pointer';
        }
      });

      map.on('mouseleave', 'hood-fill', function () {
        if (hoveredNum !== null && hoveredNum !== selectedNum) {
          map.setFeatureState({ source: 'neighborhoods', id: hoveredNum }, { hover: false });
        }
        hoveredNum = null;
        map.getCanvas().style.cursor = '';
      });

      // Click polygon on map
      map.on('click', 'hood-fill', function (e) {
        if (!e.features.length) return;
        selectNeighborhood(e.features[0].properties.num, e.lngLat);
      });

      // ── List-to-map click linking ──────────────────────────────────────
      var listContainer = document.querySelector('.hood-list[data-map="' + containerId + '"]');
      if (listContainer) {
        var listItems = listContainer.querySelectorAll('.hood-list-item[data-hood]');
        listItems.forEach(function (item) {
          item.addEventListener('click', function () {
            var num = item.getAttribute('data-hood');
            selectNeighborhood(num, null);
          });
        });
      }
    });

    return map;
  }

  // ── Lazy-init maps when containers scroll into view ──────────────────
  var maps = {};

  function lazyInitMaps() {
    var targets = document.querySelectorAll('.hood-map-container');
    if (!targets.length) return;

    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          var id = entry.target.id;
          if (!maps[id]) {
            if (id === 'map-urban-core') {
              maps[id] = initNeighborhoodMap(id, urbanCoreData);
            } else if (id === 'map-north-okc') {
              maps[id] = initNeighborhoodMap(id, northOkcData);
            }
          }
          observer.unobserve(entry.target);
        }
      });
    }, { rootMargin: '400px' });

    targets.forEach(function (el) { observer.observe(el); });
  }

  function startup() {
    HoodDrawer.init();
    lazyInitMaps();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', startup);
  } else {
    startup();
  }
})();
