document.addEventListener("DOMContentLoaded", () => {
    const opacitySlider = document.getElementById("background-opacity");
    const opacityValueDisplay = document.getElementById("opacity-value");
    const colorPicker = document.getElementById("background-color");
    const previewElement = document.getElementById("background-preview");

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
    // 获取评论描边元素
    const commentStrokeColorPicker = document.getElementById('commentStrokeColorPicker');
    const commentStrokeColors = document.getElementById('commentStrokeColors');
    const commentStrokeWidthInput = document.getElementById('commentStrokeWidth');
    const commentStrokeWidthValue = document.getElementById('commentStrokeWidthValue');

    // 获取翻译描边元素
    const translationStrokeColorPicker = document.getElementById('translationStrokeColorPicker');
    const translationStrokeColors = document.getElementById('translationStrokeColors');
    const translationStrokeWidthInput = document.getElementById('translationStrokeWidth');
    const translationStrokeWidthValue = document.getElementById('translationStrokeWidthValue');

    // 从存储加载设置
    chrome.storage.sync.get([
        'commentFont', 'commentSize', 'commentColor',
        'commentStrokeColor', 'commentStrokeWidth',
        'translationFont', 'translationSize', 'translationColor',
        'translationStrokeColor', 'translationStrokeWidth'
    ], (result) => {
        // 评论设置
        if (result.commentFont) document.getElementById('commentFont').value = result.commentFont;
        if (result.commentSize) document.getElementById('commentSize').value = result.commentSize;
        if (result.commentColor) document.getElementById('commentColor').value = result.commentColor;

        // 评论描边设置
        if (result.commentStrokeWidth) {
            commentStrokeWidthInput.value = result.commentStrokeWidth;
            commentStrokeWidthValue.textContent = `${result.commentStrokeWidth}px`;
        }
        if (result.commentStrokeColor) {
            updateColorSelection(commentStrokeColors, commentStrokeColorPicker, result.commentStrokeColor);
        } else {
            highlightSelectedColor(commentStrokeColors, 'none');
        }

        // 翻译设置
        if (result.translationFont) document.getElementById('translationFont').value = result.translationFont;
        if (result.translationSize) document.getElementById('translationSize').value = result.translationSize;
        if (result.translationColor) document.getElementById('translationColor').value = result.translationColor;

        // 翻译描边设置
        if (result.translationStrokeWidth) {
            translationStrokeWidthInput.value = result.translationStrokeWidth;
            translationStrokeWidthValue.textContent = `${result.translationStrokeWidth}px`;
        }
        if (result.translationStrokeColor) {
            updateColorSelection(translationStrokeColors, translationStrokeColorPicker, result.translationStrokeColor);
        } else {
            highlightSelectedColor(translationStrokeColors, 'none');
        }
    });

    // 评论颜色选择器变化
    commentStrokeColorPicker.addEventListener('input', function () {
        const color = this.value;
        highlightSelectedColor(commentStrokeColors, color);
        chrome.storage.sync.set({ commentStrokeColor: color });
    });

    // 翻译颜色选择器变化
    translationStrokeColorPicker.addEventListener('input', function () {
        const color = this.value;
        highlightSelectedColor(translationStrokeColors, color);
        chrome.storage.sync.set({ translationStrokeColor: color });
    });

    // 评论描边颜色选择
    commentStrokeColors.addEventListener('click', (e) => {
        if (e.target.classList.contains('color-option')) {
            const color = e.target.dataset.color;
            updateColorSelection(commentStrokeColors, commentStrokeColorPicker, color);
            chrome.storage.sync.set({ commentStrokeColor: color === 'none' ? '' : color });
        }
    });

    // 翻译描边颜色选择
    translationStrokeColors.addEventListener('click', (e) => {
        if (e.target.classList.contains('color-option')) {
            const color = e.target.dataset.color;
            updateColorSelection(translationStrokeColors, translationStrokeColorPicker, color);
            chrome.storage.sync.set({ translationStrokeColor: color === 'none' ? '' : color });
        }
    });

    // 评论描边宽度变化
    commentStrokeWidthInput.addEventListener('input', function () {
        const width = this.value;
        commentStrokeWidthValue.textContent = `${width}px`;
        chrome.storage.sync.set({ commentStrokeWidth: width });
    });

    // 翻译描边宽度变化
    translationStrokeWidthInput.addEventListener('input', function () {
        const width = this.value;
        translationStrokeWidthValue.textContent = `${width}px`;
        chrome.storage.sync.set({ translationStrokeWidth: width });
    });

    // 更新颜色选择状态
    function updateColorSelection(container, picker, color) {
        if (color === 'none' || color === '') {
            highlightSelectedColor(container, 'none');
        } else {
            highlightSelectedColor(container, color);
            picker.value = color;
        }
    }

    // 高亮选中的颜色
    function highlightSelectedColor(container, color) {
        const options = container.querySelectorAll('.color-option');
        options.forEach(option => {
            option.classList.remove('selected');
            if ((color === 'none' && option.dataset.color === 'none') ||
                (option.dataset.color === color)) {
                option.classList.add('selected');
            }
        });
    }

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