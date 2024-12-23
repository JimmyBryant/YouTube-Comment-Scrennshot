console.log("YouTube Comment Screenshot 插件已加载");

// content.js
function hasChinese(text) {
  // 匹配中文字符的正则表达式范围
  const chinesePattern = /[\u4e00-\u9fa5]/;
  return chinesePattern.test(text);
}
// Function to add the screenshot button to each comment
function addScreenshotButton() {
  // Select all YouTube comments
  const comments = document.querySelectorAll(
    "ytd-comment-thread-renderer .ytd-comment-thread-renderer"
  );

  comments.forEach((comment, index) => {
    // Check if the button already exists to avoid duplicates
    if (!comment.querySelector(".screenshot-button")) {
      // Create the screenshot button
      const button = document.createElement("button");
      button.innerText = "截图";
      button.className = "screenshot-button";

      // Append the button to the comment
      const actionButtons = comment.querySelector("#action-buttons #toolbar");
      if (actionButtons) {
        actionButtons.appendChild(button);
      }

      // Add event listener to the button to take screenshot
      button.addEventListener("click", () => {
        button.innerText = '生成中';
        takeScreenshot(comment).then(() => {
          button.innerText = '截图'; // 图片生成完成后恢复按钮文本为“截图”
        }).catch(() => {
          console.error('截图失败');
          button.innerText = '截图';
        });
      })
    }
  });
}

// 辅助函数，加载图片并返回 Promise
function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "Anonymous"; // To handle cross-origin issues
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

// 工具函数：将 HEX 转换为 RGBA
function hexToRgba(hex, opacity) {
  const bigint = parseInt(hex.slice(1), 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}
// Function to take a screenshot of the comment
async function takeScreenshot(comment) {
  return new Promise(async (resolve, reject) => {
    try {
      const canvas = document.createElement("canvas");
      const context = canvas.getContext("2d");
      const rect = comment.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;

      // 获取用户设置的背景颜色和透明度
      const { backgroundOpacity = 0.5, backgroundColor = "#ffffff" } = await new Promise((resolve) =>
        chrome.storage.sync.get(["backgroundOpacity", "backgroundColor"], resolve)
      );

      // 设置背景颜色和透明度
      context.fillStyle = hexToRgba(backgroundColor, backgroundOpacity);
      context.fillRect(0, 0, canvas.width, canvas.height);

      // 加载头像
      const avatarSrc = comment.querySelector("#author-thumbnail #img").src;
      const avatarImg = await loadImage(avatarSrc);

      // 绘制圆形头像
      drawAvatar(context, avatarImg, 30, 30, 20);

      // 绘制用户名
      const username = comment.querySelector("#author-text span").textContent.trim();
      drawText(context, username, 60, 10, true, 14);

      // 获取英文评论文本
      const textElement = comment.querySelector("#content-text");
      const englishText = extractTextFromNodes(
        textElement.querySelector("span.yt-core-attributed-string").childNodes
      );

      // 获取翻译后的中文文本
      const transElement =
        textElement.querySelector("sider-trans-text") ||
        textElement.querySelector("font.__Cici_translate_translated_inject_node__") ||
        comment.querySelector("ytd-expander sider-trans-text");

      // 绘制英文和翻译文本
      let nextY = drawTextWithWordWrap(context, englishText, 60, 30, canvas.width - 70, 14, true);
      if (transElement) {
        const chineseText = transElement.textContent.trim();
        nextY = drawTextWithWordWrap(context, chineseText, 60, nextY + 10, canvas.width - 70, 16, false);
      }

      // 绘制点赞图标和点赞数
      const likesCount = comment.querySelector("#vote-count-middle");
      if (likesCount) {
        const likes = likesCount.childNodes[0].textContent.trim();
        const thumbsUpIcon = await loadImage(chrome.runtime.getURL("thumb-up-stroke.png"));
        drawLikes(context, thumbsUpIcon, likes, 60, rect.height - 20);
      }

      // 下载截图
      const link = document.createElement("a");
      link.href = canvas.toDataURL("image/png");
      link.download = `${new Date().toDateString()}-comment-${Date.now()}.png`;
      link.click();

      resolve();

    } catch (err) {
      console.error(err);
      reject(err);
    }

  });
}

// Helper: 绘制圆形头像
function drawAvatar(context, img, x, y, radius) {
  context.save();
  context.beginPath();
  context.arc(x, y, radius, 0, Math.PI * 2, true);
  context.closePath();
  context.clip();
  context.drawImage(img, x - radius, y - radius, radius * 2, radius * 2);
  context.restore();
}

// Helper: 绘制文本
function drawText(context, text, x, y, originComment, fontSize) {
  context.font = `${fontSize}px Arial`;
  if (!originComment) {
    context.strokeStyle = "yellow";
    context.lineWidth = 2;
    context.strokeText(text, x, y);
  }
  context.fillStyle = "black";
  context.fillText(text, x, y);
}

// Helper: 绘制多行文本
function drawTextWithWordWrap(context, text, x, y, maxWidth, fontSize, originComment) {
  const isChinese = /[\u4e00-\u9fa5]/.test(text);
  const words = isChinese ? text.split("") : text.split(" ");
  const lineHeight = fontSize + 4;
  let line = "";
  let currentY = y;

  context.font = `${fontSize}px ${isChinese ? "PingFang SC" : "Arial"}`;

  words.forEach((word, index) => {
    const testLine = line + word + (isChinese ? "" : " ");
    const testWidth = context.measureText(testLine).width;
    if (testWidth > maxWidth && line) {
      drawText(context, line, x, currentY, originComment, fontSize);
      line = word + (isChinese ? "" : " ");
      currentY += lineHeight;
    } else {
      line = testLine;
    }
    if (index === words.length - 1) {
      drawText(context, line, x, currentY, originComment, fontSize);
    }
  });

  return currentY + lineHeight;
}

// Helper: 绘制点赞信息
function drawLikes(context, icon, likes, x, y) {
  context.drawImage(icon, x, y, 16, 16);
  context.fillStyle = "rgba(0,0,0,.5)";
  context.font = "12px sans-serif";
  context.fillText(likes, x + 26, y + 4);
}

// Helper: 从节点提取文本
function extractTextFromNodes(nodes) {
  return Array.from(nodes)
    .map((node) =>
      node.nodeType === Node.TEXT_NODE || (node.nodeType === Node.ELEMENT_NODE && node.tagName === "SPAN")
        ? node.textContent
        : ""
    )
    .join("");
}

// Helper: 加载图像
function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous"; // 设置跨域请求权限
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}


// Function to wrap text in canvas
// function wrapText(context, text, x, y, maxWidth, lineHeight) {
//   const words = text.split('');
//   let line = '';
//   let startY = y;

//   for (let n = 0; n < words.length; n++) {
//     const testLine = line + words[n];
//     const metrics = context.measureText(testLine);
//     const testWidth = metrics.width;

//     if (testWidth > maxWidth && n > 0) {
//       // context.fillStyle = 'yellow';
//       // context.fillRect(x, startY, maxWidth, lineHeight); // Add some padding for the background
//       context.fillStyle = 'black';
//       context.fillText(line, x, startY);

//       // Draw dashed underline
//       const underlineY = startY + lineHeight;
//       context.beginPath();
//       context.setLineDash([5, 3]); // Set the dashed line pattern
//       context.moveTo(x, underlineY);
//       context.lineTo(x + context.measureText(line).width, underlineY);
//       context.strokeStyle = 'black';
//       context.stroke();
//       context.setLineDash([]); // Reset the dashed line pattern

//       line = words[n];
//       startY += lineHeight;
//     } else {
//       line = testLine;
//     }
//   }
//   context.fillStyle = 'yellow';
//   context.fillRect(x, startY, maxWidth, lineHeight); // Add some padding for the background
//   context.fillStyle = 'black';
//   context.fillText(line, x, startY);

//   // Draw dashed underline
//   const underlineY = startY + lineHeight;
//   context.beginPath();
//   context.setLineDash([5, 3]); // Set the dashed line pattern
//   context.moveTo(x, underlineY);
//   context.lineTo(x + context.measureText(line).width, underlineY);
//   context.strokeStyle = 'black';
//   context.stroke();
//   context.setLineDash([]); // Reset the dashed line pattern

//   return startY + lineHeight; // Return the y position for the next text
// }


// Observe changes in the DOM to dynamically add buttons to newly loaded comments
const observer = new MutationObserver(addScreenshotButton);
observer.observe(document.body, { childList: true, subtree: true });

// Initial call to add buttons to already loaded comments
addScreenshotButton();
