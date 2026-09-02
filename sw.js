/* Service worker: apka ma chodzić bez internetu.
   Strategia: sieć najpierw dla samego HTML (żeby aktualizacja wchodziła od razu),
   cache najpierw dla reszty. Baza produktów zawsze przez sieć. */
var CACHE = "trening-v1";
var CORE = ["./", "./index.html"];

self.addEventListener("install", function(e){
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(function(c){ return c.addAll(CORE).catch(function(){}); }));
});

self.addEventListener("activate", function(e){
  e.waitUntil(
    caches.keys().then(function(ks){
      return Promise.all(ks.map(function(k){ return k === CACHE ? null : caches.delete(k); }));
    }).then(function(){ return self.clients.claim(); })
  );
});

self.addEventListener("fetch", function(e){
  var req = e.request;
  if(req.method !== "GET") return;
  var url = new URL(req.url);

  /* Open Food Facts i inne API zawsze z sieci, nigdy z cache */
  if(url.hostname.indexOf("openfoodfacts") >= 0) return;

  var isDoc = req.mode === "navigate" || (req.headers.get("accept") || "").indexOf("text/html") >= 0;

  if(isDoc){
    e.respondWith(
      fetch(req).then(function(res){
        var copy = res.clone();
        caches.open(CACHE).then(function(c){ c.put(req, copy); });
        return res;
      }).catch(function(){
        return caches.match(req).then(function(r){ return r || caches.match("./index.html"); });
      })
    );
    return;
  }

  e.respondWith(
    caches.match(req).then(function(hit){
      if(hit) return hit;
      return fetch(req).then(function(res){
        if(res && res.status === 200 && (url.origin === location.origin || url.hostname.indexOf("jsdelivr") >= 0 || url.hostname.indexOf("unpkg") >= 0)){
          var copy = res.clone();
          caches.open(CACHE).then(function(c){ c.put(req, copy); });
        }
        return res;
      });
    })
  );
});
