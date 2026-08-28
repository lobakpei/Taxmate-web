(function startTaxMateLtdUI(root){
  'use strict';
  var params = new URLSearchParams(root.location.search);
  var mode = params.get('mode') === 'fresh' ? 'fresh' : 'existing';
  var facade = new root.TaxMateLtdUIFacadeClient(mode);
  var mount = document.getElementById('taxmate-ltd-ui-root');
  root.TaxMateLtdUIFacade = facade;

  var renderer = root.TaxMateLtdWorkbenchRenderer;
  // Optional review conveniences (UI-only): ?locale=ur & ?theme=dark. In
  // production the shell drives these from app settings, not the URL.
  var qLocale = params.get('locale'), qTheme = params.get('theme');
  if (qLocale && renderer && renderer.setLocale) { try { renderer.setLocale(qLocale); } catch (e) {} }
  if (qTheme && renderer && renderer.setTheme) { try { renderer.setTheme(qTheme); } catch (e) {} }

  facade.subscribe(function (snapshot) { renderer.render(mount, facade, snapshot); });
  facade.refresh()
    .then(function () { return params.get('reset') === '1' ? facade.onResetPreview() : null; })
    .catch(function (error) { mount.textContent = String((error && error.message) || error); });
})(globalThis);
