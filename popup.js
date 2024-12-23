document.addEventListener("DOMContentLoaded", () => {
    const opacitySlider = document.getElementById("background-opacity");
    const opacityValueDisplay = document.getElementById("opacity-value");
    const colorPicker = document.getElementById("background-color");
    const previewElement = document.getElementById("preview");

    // 从 Chrome 存储中加载用户的背景设置
    chrome.storage.sync.get(["backgroundOpacity", "backgroundColor"], (result) => {
        const savedOpacity = result.backgroundOpacity || 0.5; // 默认透明度为 0.5
        const savedColor = result.backgroundColor || "#ffffff"; // 默认颜色为白色

        // 初始化滑块和颜色选择器
        opacitySlider.value = savedOpacity;
        opacityValueDisplay.textContent = savedOpacity;
        colorPicker.value = savedColor;

        // 更新预览
        updatePreview(savedColor, savedOpacity);
    });

    // 获取所有的设置元素
    const commentFontInput = document.getElementById('commentFont');
    const commentSizeInput = document.getElementById('commentSize');
    const commentColorInput = document.getElementById('commentColor');

    const translationFontInput = document.getElementById('translationFont');
    const translationSizeInput = document.getElementById('translationSize');
    const translationColorInput = document.getElementById('translationColor');

    chrome.storage.sync.get([
        "commentFont", "commentSize", "commentColor", 
        "translationFont", "translationSize", "translationColor"
      ], (result) => {
        // 为每个输入框设置对应的默认值
        if (result.commentFont) commentFontInput.value = result.commentFont;
        if (result.commentSize) commentSizeInput.value = result.commentSize;
        if (result.commentColor) commentColorInput.value = result.commentColor;
    
        if (result.translationFont) translationFontInput.value = result.translationFont;
        if (result.translationSize) translationSizeInput.value = result.translationSize;
        if (result.translationColor) translationColorInput.value = result.translationColor;
    });

    // 监听用户的输入变化
    commentFontInput.addEventListener('input', saveSettings);
    commentSizeInput.addEventListener('input', saveSettings);
    commentColorInput.addEventListener('input', saveSettings);

    translationFontInput.addEventListener('input', saveSettings);
    translationSizeInput.addEventListener('input', saveSettings);
    translationColorInput.addEventListener('input', saveSettings);

    // 保存设置到 chrome.storage
    function saveSettings(event) {
        const key = event.target.id; // 获取修改的输入框 ID
        let value = event.target.value;
    
        // 如果是颜色输入框，转换为标准的 color 格式
        if (event.target.type === "color") {
        value = event.target.value;
        }
    
        // 更新单个设置项
        chrome.storage.sync.set({ [key]: value });
    }

    // 使用 debounce 函数来限制频繁调用
    const saveToStorageDebounced = debounce((key, value) => {
        const data = {};
        data[key] = value;
        chrome.storage.sync.set(data);
    }, 300); // 每 300ms 只允许写入一次

    // 当滑块值变化时，更新透明度设置
    opacitySlider.addEventListener("input", (event) => {
        const opacity = event.target.value;
        opacityValueDisplay.textContent = opacity;
        updatePreview(colorPicker.value, opacity);
        saveToStorageDebounced("backgroundOpacity", opacity);
    });

    // 当颜色选择器值变化时，更新背景颜色设置
    colorPicker.addEventListener("input", (event) => {
        const color = event.target.value;
        updatePreview(color, opacitySlider.value);
        saveToStorageDebounced("backgroundColor", color);
    });

    // 更新预览区域的背景
    function updatePreview(color, opacity) {
        previewElement.style.backgroundColor = `${color}`;
        previewElement.style.opacity = opacity;
    }

    // debounce 函数实现
    function debounce(func, wait) {
        let timeout;
        return function (...args) {
            const context = this;
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(context, args), wait);
        };
    }
});