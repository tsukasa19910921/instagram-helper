// 多言語化システム
class I18n {
    constructor() {
        this.translations = {};
        this.currentLanguage = 'ja';
        this.supportedLanguages = ['ja', 'en'];
        this.initialized = false;
    }

    // 翻訳データを読み込む
    async loadTranslations() {
        try {
            const response = await fetch('./translations.json');
            this.translations = await response.json();
            this.initialized = true;
            return true;
        } catch (error) {
            console.error('Failed to load translations:', error);
            return false;
        }
    }

    // 言語を自動検出
    detectLanguage() {
        // 1. ローカルストレージから言語設定を取得
        const savedLanguage = localStorage.getItem('selectedLanguage');
        if (savedLanguage && this.supportedLanguages.includes(savedLanguage)) {
            return savedLanguage;
        }

        // 2. ブラウザの言語設定から検出
        const browserLanguages = navigator.languages || [navigator.language || navigator.userLanguage];
        for (const lang of browserLanguages) {
            const langCode = lang.toLowerCase().substring(0, 2);
            if (langCode === 'ja') {
                return 'ja';
            } else if (langCode === 'en') {
                return 'en';
            }
        }

        // 3. タイムゾーンから推測（日本のタイムゾーンなら日本語）
        const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        if (timeZone && timeZone.includes('Tokyo')) {
            return 'ja';
        }

        // 4. デフォルトは日本語
        return 'ja';
    }

    // 言語を設定
    setLanguage(language) {
        if (this.supportedLanguages.includes(language)) {
            this.currentLanguage = language;
            localStorage.setItem('selectedLanguage', language);

            // HTML要素のlang属性を更新
            document.documentElement.lang = language;

            // 言語切り替えイベントを発火
            window.dispatchEvent(new CustomEvent('languageChanged', { detail: { language } }));
            return true;
        }
        return false;
    }

    // 翻訳を取得（ネストされたキーに対応）
    translate(key, defaultValue = '') {
        if (!this.initialized || !this.translations[this.currentLanguage]) {
            return defaultValue || key;
        }

        // ドット記法でネストされたキーにアクセス
        const keys = key.split('.');
        let value = this.translations[this.currentLanguage];

        for (const k of keys) {
            if (value && typeof value === 'object' && k in value) {
                value = value[k];
            } else {
                return defaultValue || key;
            }
        }

        return value || defaultValue || key;
    }

    // 短縮形のエイリアス
    t(key, defaultValue) {
        return this.translate(key, defaultValue);
    }

    // 現在の言語を取得
    getCurrentLanguage() {
        return this.currentLanguage;
    }

    // すべての翻訳データを取得（現在の言語）
    getAllTranslations() {
        return this.translations[this.currentLanguage] || {};
    }
}

// グローバルインスタンスを作成
const i18n = new I18n();

// 言語切り替えUIを作成
function createLanguageSwitcher() {
    const switcher = document.createElement('div');
    switcher.id = 'languageSwitcher';
    switcher.className = 'fixed bottom-4 right-4 z-50 bg-white rounded-full shadow-lg p-2 flex items-center space-x-2 border border-gray-200';

    // 言語ボタンを作成
    const jaButton = createLanguageButton('ja', '🇯🇵', '日本語');
    const enButton = createLanguageButton('en', '🇺🇸', 'English');

    // 現在の言語に応じてアクティブスタイルを設定
    updateLanguageButtons(i18n.getCurrentLanguage());

    switcher.appendChild(jaButton);
    switcher.appendChild(enButton);

    return switcher;
}

// 言語ボタンを作成
function createLanguageButton(langCode, flag, label) {
    const button = document.createElement('button');
    button.className = 'language-btn px-3 py-2 rounded-full transition-all duration-200 flex items-center space-x-1 hover:scale-105';
    button.dataset.lang = langCode;
    button.innerHTML = `<span class="text-lg">${flag}</span><span class="text-sm font-medium hidden sm:inline">${label}</span>`;

    button.addEventListener('click', () => {
        i18n.setLanguage(langCode);
        updateLanguageButtons(langCode);
        updatePageContent();
    });

    return button;
}

// 言語ボタンのスタイルを更新
function updateLanguageButtons(activeLang) {
    const buttons = document.querySelectorAll('.language-btn');
    buttons.forEach(btn => {
        if (btn.dataset.lang === activeLang) {
            btn.classList.add('bg-gradient-to-r', 'from-purple-600', 'to-pink-600', 'text-white', 'shadow-md');
            btn.classList.remove('bg-gray-100', 'text-gray-700', 'hover:bg-gray-200');
        } else {
            btn.classList.remove('bg-gradient-to-r', 'from-purple-600', 'to-pink-600', 'text-white', 'shadow-md');
            btn.classList.add('bg-gray-100', 'text-gray-700', 'hover:bg-gray-200');
        }
    });
}

// ページコンテンツを更新
function updatePageContent() {
    // データ属性を持つすべての要素を更新
    document.querySelectorAll('[data-i18n]').forEach(element => {
        const key = element.getAttribute('data-i18n');
        const translation = i18n.t(key);

        // テキストコンテンツかプレースホルダーか判断
        if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') {
            if (element.hasAttribute('placeholder')) {
                element.placeholder = translation;
            }
        } else if (element.tagName === 'SELECT') {
            // SELECT要素の場合は特別な処理が必要
            updateSelectOptions(element, key);
        } else {
            // アイコンを保持しながらテキストを更新
            const icon = element.querySelector('i, .fas, .fab, .fa');
            if (icon) {
                const iconHTML = icon.outerHTML;
                element.innerHTML = iconHTML + ' ' + translation;
            } else {
                element.textContent = translation;
            }
        }
    });

    // 特別な要素の更新（動的に生成される要素など）
    updateDynamicElements();
}

// SELECT要素のオプションを更新
function updateSelectOptions(selectElement, baseKey) {
    const options = selectElement.querySelectorAll('option');
    options.forEach(option => {
        const optionValue = option.value;
        const optionKey = `${baseKey}.options.${optionValue}`;
        const translation = i18n.t(optionKey);
        if (translation && translation !== optionKey) {
            option.textContent = translation;
        }
    });
}

// 動的要素の更新（トーストメッセージなど）
function updateDynamicElements() {
    // 言語設定のSELECT要素を特別処理（投稿言語とは別）
    const languageSelect = document.getElementById('language');
    if (languageSelect) {
        const options = languageSelect.querySelectorAll('option');
        options.forEach(option => {
            const key = `settings.language.options.${option.value}`;
            option.textContent = i18n.t(key);
        });
    }
}

// DOMContentLoaded時の初期化
document.addEventListener('DOMContentLoaded', async () => {
    // 翻訳データを読み込む
    await i18n.loadTranslations();

    // 言語を自動検出して設定
    const detectedLanguage = i18n.detectLanguage();
    i18n.setLanguage(detectedLanguage);

    // 言語切り替えUIを追加
    const switcher = createLanguageSwitcher();
    document.body.appendChild(switcher);

    // 初期コンテンツを更新
    updatePageContent();
});

// エクスポート（他のスクリプトから使用可能にする）
window.i18n = i18n;
window.updatePageContent = updatePageContent;