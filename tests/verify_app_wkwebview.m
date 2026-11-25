#import <Cocoa/Cocoa.h>
#import <WebKit/WebKit.h>

@interface FullTestDelegate : NSObject <WKNavigationDelegate>
@property (strong) WKWebView *webView;
@end

@implementation FullTestDelegate
- (void)webView:(WKWebView *)webView didFinishNavigation:(WKNavigation *)navigation {
    dispatch_after(dispatch_time(DISPATCH_TIME_NOW, (int64_t)(1.5 * NSEC_PER_SEC)), dispatch_get_main_queue(), ^{
        NSString *js = @"(function() {"
            "const errors = Array.isArray(window.__BOOT_ERRORS__) ? window.__BOOT_ERRORS__.slice() : [];"
            "window.addEventListener('error', e => errors.push(e.message || 'error'));"
            "try {"
            "  if (!window.INTERNA_DATA || !window.InternaApp || !window.InternaRuntime) {"
            "    return JSON.stringify({ ok:false, error:'Missing globals', jsErrors: errors });"
            "  }"
            "  const divs = window.INTERNA_DATA.divisions.length;"
            "  const qs = window.INTERNA_DATA.questions.length;"
            "  const mods = window.InternaRuntime.utils.getAllModules().length;"
            "  const views = ['home', 'materi', 'widgets', 'tryout', 'profile', 'battle'];"
            "  views.forEach(v => { window.InternaApp.navigate(v); });"
            "  window.InternaApp.navigate('widgets');"
            "  const catalog = window.InternaRuntime.registry.getWidgetCatalog();"
            "  const emptyWidgets = [];"
            "  const widgetErrors = [];"
            "  catalog.forEach(item => {"
            "    try {"
            "      window.InternaApp.selectWidgetFromHub(item.widgetType);"
            "      const stage = document.getElementById('widget-active-stage');"
            "      if (!stage || stage.innerText.trim().length < 20) emptyWidgets.push(item.widgetType);"
            "    } catch (we) {"
            "      widgetErrors.push({ type: item.widgetType, msg: we.message });"
            "    }"
            "  });"
            "  window.InternaApp.closeActiveWidgetStage();"
            "  window.InternaApp.startSnackQuiz();"
            "  const sqHeader = (document.querySelector('#quiz-question-container .med-card > div:first-child') || {}).innerText || '';"
            "  window.InternaApp.selectQuizOption(0);"
            "  window.InternaApp.submitQuizAnswer();"
            "  const fbPanel = document.getElementById('quiz-feedback-panel');"
            "  const fbText = fbPanel ? fbPanel.innerText : '';"
            "  window.InternaApp.exitQuizEarly();"
            "  window.InternaApp.startTryout(25, ['tropik-infeksi','kardiologi','pulmonologi','gastroenterohepatologi','ginjal-hipertensi','endokrin-metabolik','hematologi-onkologi','reumatologi','geriatri','alergi-imunologi','psikosomatik-paliatif']);"
            "  window.InternaApp.openLabModal();"
            "  const labOpen = !document.getElementById('lab-modal').classList.contains('hidden');"
            "  document.getElementById('lab-modal').classList.add('hidden');"
            "  window.InternaApp.toggleTocModal(true);"
            "  const tocOpen = !document.getElementById('toc-modal').classList.contains('hidden');"
            "  window.InternaApp.toggleTocModal(false);"
            "  window.InternaApp.openMaterialCarousel('endo-1-1', 0);"
            "  const carOpen = !document.getElementById('carousel-modal').classList.contains('hidden');"
            "  window.InternaApp.closeMaterialCarousel();"
            "  window.InternaApp.navigate('home');"
            "  window.InternaApp.openGlobalSearch();"
            "  window.InternaApp.updateGlobalSearchResults('dss');"
            "  const gsButtons = Array.from(document.querySelectorAll('#gs-results-list button'));"
            "  const gsWidgetIdx = gsButtons.findIndex(b => b.innerText.includes('Widget'));"
            "  if (gsWidgetIdx >= 0) gsButtons[gsWidgetIdx].click();"
            "  const gsStageText = (document.getElementById('widget-active-stage') || {}).innerText || '';"
            "  const gsWidgetOpened = gsWidgetIdx >= 0 && gsStageText.trim().length > 20;"
            "  const sampleHandlers = ['calcDSS','calcSepsis','updateDengueViz','updateCardioWavefrontViz','updateNefroFiltrationViz','updatePulmoSpiroViz','updateGehEsophagealMotilityViz','updateEndoDmCriteriaViz','updateHomIronPanelViz','calcHomDicIsth','calcHomAncMascc','updateReumaSynovialAnaViz','updateReumaHandJointViz','calcReumaRaAcr2010','updateReumaCrystalViz','updateGeriCgaViz','calcGeriBarthelAdl','updateGeriBeersViz','updateGeriCamViz','updateGeriDemViz','updateGeriRefeedViz','calcGeriMnaRefeeding','updateGeriPiViz','updateAlergiVacViz','calcPsikoFibromyalgia','updatePsikoWhoViz','updateTropikAbxTab','setGehHbvCalcTab'];"
            "  const missingHandlers = sampleHandlers.filter(h => typeof window.InternaApp[h] !== 'function');"
            "  return JSON.stringify({"
            "    ok: errors.length === 0 && emptyWidgets.length === 0 && widgetErrors.length === 0 && missingHandlers.length === 0 && gsWidgetOpened,"
            "    divs, mods, qs,"
            "    catalogCount: catalog.length,"
            "    emptyWidgets, widgetErrors, missingHandlers,"
            "    sqHeaderClean: !sqHeader.includes('Dengue') && sqHeader.length > 0,"
            "    fbHasAnchor: fbText.includes('Guideline Anchor:'),"
            "    fbNoKeywords: fbPanel ? fbPanel.querySelectorAll('.keyword-pill').length === 0 : false,"
            "    labOpen, tocOpen, carOpen, gsWidgetOpened, jsErrors: errors"
            "  });"
            "} catch(e) {"
            "  return JSON.stringify({ ok:false, fatal:e.message, stack:e.stack, jsErrors:errors });"
            "}"
            "})();";
        [webView evaluateJavaScript:js completionHandler:^(id res, NSError *err) {
            if (err) {
                printf("EVAL_ERR: %s | %s\n", [[err localizedDescription] UTF8String], [[NSString stringWithFormat:@"%@", err.userInfo] UTF8String]);
            } else {
                printf("E2E_WKWEBVIEW_RESULT: %s\n", [[NSString stringWithFormat:@"%@", res] UTF8String]);
            }
            [NSApp terminate:nil];
        }];
    });
}
@end

int main(int argc, const char * argv[]) {
    @autoreleasepool {
        [NSApplication sharedApplication];
        WKWebViewConfiguration *cfg = [[WKWebViewConfiguration alloc] init];
        [cfg.preferences setValue:@YES forKey:@"allowFileAccessFromFileURLs"];
        NSString *bootHook = @"window.__BOOT_ERRORS__ = [];"
            "window.addEventListener('error', function(e){ window.__BOOT_ERRORS__.push((e && e.message) || 'script-error'); });"
            "window.addEventListener('unhandledrejection', function(e){ window.__BOOT_ERRORS__.push((e && e.reason && e.reason.message) || String(e && e.reason || 'rejection')); });";
        WKUserScript *earlyScript = [[WKUserScript alloc] initWithSource:bootHook injectionTime:WKUserScriptInjectionTimeAtDocumentStart forMainFrameOnly:YES];
        [cfg.userContentController addUserScript:earlyScript];
        WKWebView *wv = [[WKWebView alloc] initWithFrame:NSMakeRect(0, 0, 1280, 900) configuration:cfg];
        FullTestDelegate *del = [[FullTestDelegate alloc] init];
        del.webView = wv;
        wv.navigationDelegate = del;
        NSString *rootPath = (argc > 1 && argv[1])
            ? [NSString stringWithUTF8String:argv[1]]
            : [[NSFileManager defaultManager] currentDirectoryPath];
        NSURL *base = [NSURL fileURLWithPath:rootPath isDirectory:YES];
        NSURL *idx = [base URLByAppendingPathComponent:@"index.html"];
        [wv loadFileURL:idx allowingReadAccessToURL:base];
        dispatch_after(dispatch_time(DISPATCH_TIME_NOW, (int64_t)(18 * NSEC_PER_SEC)), dispatch_get_main_queue(), ^{
            printf("TIMEOUT\n");
            [NSApp terminate:nil];
        });
        [NSApp run];
    }
    return 0;
}
