console.log("YouTube Comment Screenshot 插件已加载");
const commentSection = document.querySelector('.note-scroller'); // 评论区
const controlArea = document.querySelector('.interaction-container .author-wrapper'); // 按钮添加区域
const scrollDistance = 200; // 每次滚动 100 像素
const intervalTime = 3000; // 3 秒滚动一次
const scrollDuration = 500; // 500ms 内完成滚动（平滑滚动速度）

let isScrolling = false; // 记录是否正在滚动
let scrollInterval; // 存储 setInterval 句柄

// 创建按钮
const scrollButton = document.createElement('button');
scrollButton.textContent = '开始滚动';
scrollButton.style.cssText = `
  padding: 8px 16px;
  font-size: 14px;
  cursor: pointer;
  margin-top: 10px;
  background: #080808;
  border-radius: 5px;
  color: #FFF;
`;
if(controlArea){
  controlArea.appendChild(scrollButton);
}

// 切换滚动状态
function toggleScroll() {
  if (isScrolling) {
    clearInterval(scrollInterval);
    scrollButton.textContent = '开始滚动';
  } else {
    scrollInterval = setInterval(() => {
      if (commentSection.scrollTop < commentSection.scrollHeight - commentSection.clientHeight) {
        commentSection.scrollTop += scrollDistance;
      } else {
        commentSection.scrollTop = 0; // 回到顶部，形成循环滚动
      }
    }, intervalTime);

    scrollButton.textContent = '停止滚动';
  }
  isScrolling = !isScrolling;
}

// 绑定按钮点击事件
scrollButton.addEventListener('click', toggleScroll);

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

// 获取所有用户设置
async function getUserSettings() {
  return new Promise((resolve) => {
    chrome.storage.sync.get(
      [
       "backgroundOpacity",
        "backgroundColor",
        "commentFont",
        "commentSize",
        "commentColor",
        "commentStrokeColor",
        "commentStrokeWidth",
        "translationFont",
        "translationSize",
        "translationColor",
        "translationStrokeColor",
        "translationStrokeWidth"
      ],
      resolve
    );
  });
}

// Helper: 计算文字总高度
function calculateTextHeight(context, text, maxWidth, fontSize, lineHeight) {
  const isChinese = /[\u4e00-\u9fa5]/.test(text);
  const words = isChinese ? text.split("") : text.split(" ");
  let line = "";
  let totalHeight = 0;

  context.font = `${fontSize}px ${isChinese ? "PingFang SC" : "Arial"}`;

  words.forEach((word, index) => {
    const testLine = line + word + (isChinese ? "" : " ");
    const testWidth = context.measureText(testLine).width;
    if (testWidth > maxWidth && line) {
      totalHeight += lineHeight;
      line = word + (isChinese ? "" : " ");
    } else {
      line = testLine;
    }
    if (index === words.length - 1) {
      totalHeight += lineHeight;
    }
  });

  return totalHeight;
}
const baseLinePadding = 3*2; // 文字顶部部与评论框底部的距离+底部与评论框底部的距离
// Function to take a screenshot of the comment
async function takeScreenshot(comment) {
  return new Promise(async (resolve, reject) => {
    try {
      const canvas = document.createElement("canvas");
      const context = canvas.getContext("2d");
      const rect = comment.getBoundingClientRect();
      // canvas.width = rect.width;
      // canvas.height = rect.height;
      const canvasWidth = rect.width;
      const maxTextWidth = canvasWidth - 70; // 文本区域宽度

      // 获取用户设置
      let {
        backgroundOpacity = 0.5,
        backgroundColor = "#ffffff",
        commentFont = "Arial",
        commentSize = 14,
        commentColor = "#333",
        translationFont = "Arial",
        translationSize = 16,
        translationColor = "#000",
      } = await getUserSettings();

      // 确保字体大小为数字
      commentSize = parseInt(commentSize, 10) || 14; // 默认值为 14
      translationSize = parseInt(translationSize, 10) || 16; // 默认值为 16

      // 获取原始评论文本
      const textElement = comment.querySelector("#content-text");
      const originComment = extractTextFromNodes(
        textElement.querySelector("span.yt-core-attributed-string").childNodes
      );

      // 获取翻译后的中文文本
      const transElement =
        comment.querySelector("ytd-expander aipal-trans aipal-trans-text") ||
        textElement.querySelector("sider-trans-text") ||
        textElement.querySelector("font.__Cici_translate_translated_inject_node__") ||
        comment.querySelector("ytd-expander sider-trans-text");
      const translatedText = transElement ? transElement.textContent.trim() : "";

      // 计算动态部分高度
      const usernameHeight = 40; // 固定
      const likesHeight = 20; // 固定

      const originTextHeight = calculateTextHeight(context, originComment, maxTextWidth, commentSize, commentSize+baseLinePadding);
      const translatedTextHeight = translatedText
        ? calculateTextHeight(context, translatedText, maxTextWidth, translationSize, translationSize+baseLinePadding)
        : 0;

      // 总高度 = 姓名高度 + 原评论高度 + 翻译高度 + 点赞高度 + 边距
      const canvasHeight = usernameHeight + originTextHeight + translatedTextHeight + likesHeight + 10;

      // 设置 canvas 尺寸
      canvas.width = canvasWidth;
      canvas.height = canvasHeight;

      // 设置背景颜色和透明度
      context.fillStyle = hexToRgba(backgroundColor, backgroundOpacity);
      context.fillRect(0, 0, canvas.width, canvas.height);

      // 加载头像
      const avatarSrc = comment.querySelector("#author-thumbnail #img").src;
      const avatarImg = await loadImage(avatarSrc);

      // 绘制圆形头像
      drawAvatar(context, avatarImg, 30, 30, 20);

      // 绘制用户名
      let textY = 20
      const username = comment.querySelector("#author-text span").textContent.trim();
      drawUsername(context, username, 60, textY);

      // 绘制原评论和翻译后的评论文本
      let nextY = drawTextWithWordWrap(context, originComment, 60, textY + 20, canvas.width - 70, commentFont, commentSize, commentColor, true);
      if (translatedText) {
        nextY = drawTextWithWordWrap(context, translatedText, 60, nextY + 10, canvas.width - 70, translationFont, translationSize, translationColor, false);
      }

      // 绘制点赞图标和点赞数
      const likesCount = comment.querySelector("#vote-count-middle");
      if (likesCount) {
        const likes = likesCount.childNodes[0].textContent.trim();
        const thumbsUpIcon = await loadImage(chrome.runtime.getURL("thumb-up-stroke.png"));
        console.log('likes y',canvasHeight - 20)
        drawLikes(context, thumbsUpIcon, likes, 60, canvasHeight - 20);
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

// 修改后的 drawText 函数，支持描边效果
async function drawText(context, text, x, y, font, fontSize, color, originComment = false) {
    const settings = await getUserSettings();
    
    context.font = `${parseInt(fontSize)}px ${font}`;
    
    // 根据是评论还是翻译应用不同的描边设置
    if (originComment && settings.commentStrokeColor) {
        context.strokeStyle = settings.commentStrokeColor;
        context.lineWidth = parseInt(settings.commentStrokeWidth) || 2;
        context.strokeText(text, x, y);
    } 
    else if (!originComment && settings.translationStrokeColor) {
        context.strokeStyle = settings.translationStrokeColor;
        context.lineWidth = parseInt(settings.translationStrokeWidth) || 2;
        context.strokeText(text, x, y);
    }
    
    context.fillStyle = color;
    context.fillText(text, x, y);
}

// 专门绘制用户名的函数
function drawUsername(context, text, x, y) {
    const usernameFont = "Arial";
    const usernameSize = 12;
    const usernameColor = '#0F0F0F';
    
    context.font = `${usernameSize}px ${usernameFont}`;
    context.fillStyle = usernameColor;
    context.fillText(text, x, y);
}
// Helper: 绘制多行文本
function drawTextWithWordWrap(context, text, x, y, maxWidth, font, fontSize, color, originComment = false) {
  const isChinese = /[\u4e00-\u9fa5]/.test(text);
  const words = isChinese ? text.split("") : text.split(" "); // 中文按字切割，其他按单词
  fontSize = parseInt(fontSize);
  const lineHeight = fontSize + baseLinePadding; // 行高
  let line = "";
  let currentY = y;

  context.font = `${fontSize}px ${font}`;
  context.fillStyle = color;

  words.forEach((word, index) => {
    const testLine = line + word + (isChinese ? "" : " ");
    const testWidth = context.measureText(testLine).width;

    // 如果超出最大宽度则换行
    if (testWidth > maxWidth && line) {
      drawText(context, line.trim(), x, currentY, font, fontSize, color, originComment);
      line = word + (isChinese ? "" : " ");
      currentY += lineHeight; // 下一行的 y 坐标
    } else {
      line = testLine;
    }

    // 绘制最后一行
    if (index === words.length - 1) {
      drawText(context, line.trim(), x, currentY, font, fontSize, color, originComment);
    }
  });

  return currentY + lineHeight; // 返回最后一行的 y 坐标
}

// // Helper: 绘制文本
// function drawText(context, text, x, y, originComment, fontSize) {
//   context.font = `${fontSize}px Arial`;
//   if (!originComment) {
//     context.strokeStyle = "yellow";
//     context.lineWidth = 2;
//     context.strokeText(text, x, y);
//   }
//   context.fillStyle = "black";
//   context.fillText(text, x, y);
// }

// // Helper: 绘制多行文本
// function drawTextWithWordWrap(context, text, x, y, maxWidth, fontSize, originComment) {
//   const isChinese = /[\u4e00-\u9fa5]/.test(text);
//   const words = isChinese ? text.split("") : text.split(" ");
//   const lineHeight = fontSize + 4;
//   let line = "";
//   let currentY = y;

//   context.font = `${fontSize}px ${isChinese ? "PingFang SC" : "Arial"}`;

//   words.forEach((word, index) => {
//     const testLine = line + word + (isChinese ? "" : " ");
//     const testWidth = context.measureText(testLine).width;
//     if (testWidth > maxWidth && line) {
//       drawText(context, line, x, currentY, originComment, fontSize);
//       line = word + (isChinese ? "" : " ");
//       currentY += lineHeight;
//     } else {
//       line = testLine;
//     }
//     if (index === words.length - 1) {
//       drawText(context, line, x, currentY, originComment, fontSize);
//     }
//   });

//   return currentY + lineHeight;
// }

// Helper: 绘制点赞信息
function drawLikes(context, icon, likes, x, y) {
  const iconSize = 16; // 图标尺寸
  const fontSize = 12; // 文字尺寸

  // 绘制图标
  context.drawImage(icon, x, y, iconSize, iconSize);

  // 设置文字样式
  context.fillStyle = "rgba(0,0,0,.5)";
  context.font = `${fontSize}px sans-serif`;

  // 手动调整文字的 y 坐标，使其基线与图标垂直中心对齐
  const textY = y + iconSize / 2 + fontSize / 2; // 字体基线调整 (fontSize / 3 是经验值)

  // 绘制文字
  context.fillText(likes, x + iconSize + 10, textY);
}

// Helper: 从节点提取文本
function extractTextFromNodes(nodes) {
  return Array.from(nodes)
    .map((node) =>
      node.nodeType === Node.TEXT_NODE || (node.nodeType === Node.ELEMENT_NODE && ["SPAN", "FONT"].includes(node.tagName))
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
