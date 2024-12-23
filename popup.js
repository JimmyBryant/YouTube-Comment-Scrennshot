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