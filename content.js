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
        }).catch(()=>{
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

// Function to take a screenshot of the comment
async function takeScreenshot(comment) {
  return new Promise(async (resolve, reject) => {
    try {
      // Create a canvas element
      const canvas = document.createElement("canvas");
      const context = canvas.getContext("2d");

      // Set canvas size to match the comment element size
      const rect = comment.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;

      // Set canvas background color
      context.fillStyle = "rgba(255,255,255,.5)";
      context.fillRect(0, 0, canvas.width, canvas.height);

      // Load the avatar image and draw it on the canvas
      const avatar = comment.querySelector("#author-thumbnail #img").src;
      const img = await loadImage(avatar);

      context.save();
      context.beginPath();
      context.arc(30, 30, 20, 0, Math.PI * 2, true); // Draw a circle for the avatar
      context.closePath();
      context.clip();
      context.drawImage(img, 10, 10, 40, 40); // Draw the avatar image
      context.restore();

      // Set text styles and draw username
      const username = comment.querySelector("#author-text span").textContent.trim();
      context.fillStyle = "black";
      context.font = "14px Arial";
      context.textBaseline = "top";
      context.fillText(username, 60, 10);

      // 获取英文文本
      const text = comment.querySelector("#content-text");
      const textChildNodes = text.querySelector('span.yt-core-attributed-string').childNodes;
      let englishText = Array.from(textChildNodes).map(node => 
        node.nodeType === Node.TEXT_NODE || (node.nodeType === Node.ELEMENT_NODE && node.tagName === 'SPAN') 
          ? node.textContent 
          : ''
      ).join('');

      // Function to handle text drawing based on type (English or Chinese)
      function drawTextWithUnderline(text, x, y, maxWidth, fontSize) {
        const isChinese = hasChinese(text);
        const words = text.split(isChinese ? '' : ' ');
        const gap = 2;
        const lineHeight = fontSize + gap * 2;
        context.font = `${fontSize}px ${isChinese ? 'PingFang SC' : 'Arial'}`;

        let line = '';
        let startY = y;

        for (let n = 0; n < words.length; n++) {
          const testLine = line + words[n] + (isChinese ? '' : ' ');
          const metrics = context.measureText(testLine);
          const testWidth = metrics.width;

          if (testWidth > maxWidth && n > 0) {
            // Draw text and underline
            drawText(line, x, startY, isChinese, fontSize);
            drawUnderline(x, startY + lineHeight, line);

            line = words[n] + (isChinese ? '' : ' ');
            startY += lineHeight;
          } else {
            line = testLine;
          }
        }

        // Draw any remaining text
        drawText(line, x, startY, isChinese, fontSize);
        drawUnderline(x, startY + lineHeight, line);
        return startY + lineHeight; // Return the y position for the next text
      }

      // Draw text with underline
      function drawText(text, x, y, isChinese, fontSize) {
        context.fillStyle = 'black';
        context.fillText(text, x, y);
      }

      function drawUnderline(x, y, text) {
        context.beginPath();
        context.setLineDash([5, 3]); // Set the dashed line pattern
        context.moveTo(x, y);
        context.lineTo(x + context.measureText(text).width, y);
        context.strokeStyle = 'rgba(200, 200, 200, 1)';
        context.stroke();
        context.setLineDash([]); // Reset the dashed line pattern
      }

      // 获取翻译后的中文文本
      const trans = text.querySelector("sider-trans-text") || text.querySelector("font.__Cici_translate_translated_inject_node__") || comment.querySelector('ytd-expander sider-trans-text');
      let nextY;
      if (trans) {
        // 获取翻译后的中文文本
        const chineseText = trans.textContent.trim();
        nextY = drawTextWithUnderline(englishText, 60, 30, canvas.width - 70, 14);
        drawTextWithUnderline(chineseText, 60, nextY + 2, canvas.width - 70, 24);
      } else {
        drawTextWithUnderline(englishText, 60, 30, canvas.width - 70, 16);
      }

      // 获取评论点赞数
      const likesCount = comment.querySelector('#vote-count-middle');
      if (likesCount) {
        const likes = likesCount.childNodes[0].textContent.trim();
        const thumbsUpIcon = new Image();
        thumbsUpIcon.src = chrome.runtime.getURL('thumb-up-stroke.png');
        
        await new Promise((resolve, reject) => {
          thumbsUpIcon.onload = resolve;
          thumbsUpIcon.onerror = reject;
        });
        
        context.fillStyle = 'rgba(0,0,0,.5)';
        context.font = '12px sans-serif';
        context.drawImage(thumbsUpIcon, 60, rect.height - 20, 16, 16); // Draw thumbs up icon
        context.fillText(likes, 90, rect.height - 16); // Render likes count next to the icon
      }

      // Create a download link
      const link = document.createElement("a");
      link.href = canvas.toDataURL("image/png");
      link.download = `${new Date().toDateString()}-comment-${Date.now()}.png`;
      link.click();

      resolve();
    } catch (err) {
      console.error('下载头像有问题', err);
      reject(err);
    }
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
