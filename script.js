document.addEventListener('DOMContentLoaded', () => {
    const taskInput = document.getElementById('taskInput');
    const addTaskBtn = document.getElementById('addTaskBtn');
    const taskList = document.getElementById('taskList');
    const taskCountSpan = document.getElementById('taskCount');
    const clearCompletedBtn = document.getElementById('clearCompletedBtn');
    const clearAllBtn = document.getElementById('clearAllBtn');
    const prioritySelect = document.getElementById('prioritySelect');
    const emptyMessage = document.getElementById('emptyMessage');

    let tasks = JSON.parse(localStorage.getItem('tasks')) || [];

    function saveTasks() {
        localStorage.setItem('tasks', JSON.stringify(tasks));
    }

    function renderTasks() {
        taskList.innerHTML = '';
        
        if (tasks.length === 0) {
            emptyMessage.style.display = 'block';
        } else {
            emptyMessage.style.display = 'none';
        }

        tasks.forEach((task, index) => {
            const listItem = document.createElement('li');
            if (task.completed) {
                listItem.classList.add('completed');
            }

            // 优先级标识
            const priorityBadge = document.createElement('span');
            const priority = task.priority || 'medium'; // 默认中优先级
            priorityBadge.classList.add('priority-badge', `priority-${priority}`);
            const priorityText = { 'high': '高', 'medium': '中', 'low': '低' };
            priorityBadge.textContent = priorityText[priority];

            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.checked = task.completed;
            checkbox.addEventListener('change', () => {
                task.completed = !task.completed;
                saveTasks();
                renderTasks();
            });

            const taskText = document.createElement('span');
            taskText.textContent = task.text;
            
            // 点击文本进入编辑模式
            taskText.addEventListener('click', () => {
                if (task.completed) return; // 已完成的任务不能编辑
                
                const input = document.createElement('input');
                input.type = 'text';
                input.value = task.text;
                input.classList.add('edit-input');
                
                input.addEventListener('blur', () => {
                    const newText = input.value.trim();
                    if (newText !== '') {
                        task.text = newText;
                        saveTasks();
                    }
                    renderTasks();
                });
                
                input.addEventListener('keypress', (e) => {
                    if (e.key === 'Enter') {
                        input.blur();
                    }
                });
                
                listItem.replaceChild(input, taskText);
                input.focus();
            });

            const deleteBtn = document.createElement('button');
            deleteBtn.textContent = '删除';
            deleteBtn.classList.add('delete-btn');
            deleteBtn.addEventListener('click', () => {
                tasks.splice(index, 1);
                saveTasks();
                renderTasks();
            });

            listItem.appendChild(checkbox);
            listItem.appendChild(priorityBadge);
            listItem.appendChild(taskText);
            listItem.appendChild(deleteBtn);
            taskList.appendChild(listItem);
        });
        updateTaskCount();
    }

    function addTask() {
        const text = taskInput.value.trim();
        const priority = prioritySelect.value;
        if (text !== '') {
            tasks.push({ text: text, completed: false, priority: priority });
            taskInput.value = '';
            saveTasks();
            renderTasks();
        }
    }

    function updateTaskCount() {
        const incompleteTasks = tasks.filter(task => !task.completed).length;
        const completedTasks = tasks.filter(task => task.completed).length;
        taskCountSpan.textContent = `${incompleteTasks} 个任务待完成`;
        
        // 动态显示或隐藏按钮
        if (clearCompletedBtn) {
            clearCompletedBtn.style.display = completedTasks > 0 ? 'inline-block' : 'none';
        }
        if (clearAllBtn) {
            clearAllBtn.style.display = tasks.length > 0 ? 'inline-block' : 'none';
        }
    }

    addTaskBtn.addEventListener('click', addTask);

    if (clearCompletedBtn) {
        clearCompletedBtn.addEventListener('click', () => {
            // 过滤掉已完成的任务，更新原数组
            const remainingTasks = tasks.filter(task => !task.completed);
            tasks.length = 0;
            tasks.push(...remainingTasks);
            saveTasks();
            renderTasks();
        });
    }

    if (clearAllBtn) {
        clearAllBtn.addEventListener('click', () => {
            if (confirm('确定要清空所有任务吗？')) {
                tasks.length = 0; // 清空数组
                saveTasks();
                renderTasks();
            }
        });
    }

    taskInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            addTask();
        }
    });

    renderTasks();
});
