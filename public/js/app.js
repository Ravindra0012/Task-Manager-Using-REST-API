// public/js/app.js

document.addEventListener('DOMContentLoaded', () => {
    const addTaskBtn = document.getElementById('add-task-btn');
    const newTaskTitle = document.getElementById('new-task-title');
    const newTaskDesc = document.getElementById('new-task-desc');
    const newTaskDate = document.getElementById('new-task-date');
    const taskList = document.getElementById('task-list');

    const editModal = document.getElementById('edit-modal');
    const closeModalBtn = document.querySelector('.close');
    const saveTaskBtn = document.getElementById('save-task-btn');
    const editTaskTitle = document.getElementById('edit-task-title');
    const editTaskDesc = document.getElementById('edit-task-desc');
    const editTaskDate = document.getElementById('edit-task-date');

    let currentEditTask;
    let notificationTimeouts = {};

    const apiUrl = '/api/tasks';

    // Fetch and display tasks
    const fetchTasks = async () => {
        const response = await fetch(apiUrl);
        const tasks = await response.json();
        tasks.forEach(task => addTaskElement(task));
    };

    // Request permission for notifications
    if ('Notification' in window && Notification.permission !== 'granted') {
        Notification.requestPermission();
    }

    addTaskBtn.addEventListener('click', async () => {
        const taskTitle = newTaskTitle.value.trim();
        const taskDesc = newTaskDesc.value.trim();
        const taskDate = newTaskDate.value;
        if (taskTitle !== '' && taskDesc !== '' && taskDate !== '') {
            const newTask = { title: taskTitle, description: taskDesc, completed: false, date: taskDate };
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newTask)
            });
            const task = await response.json();
            addTaskElement(task);
            newTaskTitle.value = '';
            newTaskDesc.value = '';
            newTaskDate.value = '';
            newTaskTitle.focus();
        }
    });

    function addTaskElement(task) {
        const li = document.createElement('li');

        const infoIcon = document.createElement('div');
        infoIcon.classList.add('info-icon');
        infoIcon.innerHTML = '<i class="fas fa-info-circle"></i><span class="tooltip-text">Mark as completed</span>';

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.checked = task.completed;
        checkbox.classList.add('task-checkbox');
        const checkboxId = `task-checkbox-${task._id}`;
        checkbox.id = checkboxId;
        checkbox.addEventListener('change', async () => {
            li.classList.toggle('completed', checkbox.checked);
            await fetch(`${apiUrl}/${task._id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ completed: checkbox.checked })
            });
        });

        const checkboxLabel = document.createElement('label');
        checkboxLabel.setAttribute('for', checkboxId);

        const taskInfo = document.createElement('div');
        taskInfo.classList.add('task-info');
        taskInfo.innerHTML = `<strong>${task.title}</strong><br>${truncateText(task.description, 20)}<br><small>${task.date}</small>`;

        const viewBtn = document.createElement('button');
        viewBtn.textContent = 'View';
        viewBtn.classList.add('view-btn');
        viewBtn.addEventListener('click', () => {
            alert(task.description);
        });

        const notifyBtn = document.createElement('button');
        notifyBtn.innerHTML = '<i class="fas fa-bell"></i><span class="tooltip-text">Notify one day before due date</span>';
        notifyBtn.classList.add('notify-btn');
        notifyBtn.addEventListener('click', () => {
            const icon = notifyBtn.querySelector('i');
            if (icon.classList.contains('fa-bell')) {
                setNotification(task.title, task.date, notifyBtn);
                icon.classList.remove('fa-bell');
                icon.classList.add('fa-bell-slash');
                notifyBtn.querySelector('.tooltip-text').textContent = 'Cancel notification';
                notifyBtn.classList.add('active');
            } else {
                cancelNotification(task.title);
                icon.classList.remove('fa-bell-slash');
                icon.classList.add('fa-bell');
                notifyBtn.querySelector('.tooltip-text').textContent = 'Notify one day before due date';
                notifyBtn.classList.remove('active');
            }
        });

        const editBtn = document.createElement('button');
        editBtn.textContent = 'Edit';
        editBtn.classList.add('edit-btn');
        editBtn.addEventListener('click', () => {
            openEditModal(task);
        });

        const deleteBtn = document.createElement('button');
        deleteBtn.textContent = 'Delete';
        deleteBtn.classList.add('delete-btn');
        deleteBtn.addEventListener('click', async () => {
            cancelNotification(task.title);
            await fetch(`${apiUrl}/${task._id}`, { method: 'DELETE' });
            taskList.removeChild(li);
        });

        li.appendChild(infoIcon);
        li.appendChild(checkbox);
        li.appendChild(checkboxLabel);
        li.appendChild(taskInfo);
        li.appendChild(viewBtn);
        li.appendChild(notifyBtn);
        li.appendChild(editBtn);
        li.appendChild(deleteBtn);

        taskList.appendChild(li);
        if (task.completed) {
            li.classList.add('completed');
        }
    }

    function truncateText(text, wordLimit) {
        const words = text.split(' ');
        if (words.length > wordLimit) {
            return words.slice(0, wordLimit).join(' ') + '...';
        }
        return text;
    }

    function openEditModal(task) {
        currentEditTask = task;
        editTaskTitle.value = task.title;
        editTaskDesc.value = task.description;
        editTaskDate.value = task.date;
        editModal.style.display = 'block';
    }

    closeModalBtn.addEventListener('click', () => {
        editModal.style.display = 'none';
    });

    saveTaskBtn.addEventListener('click', async () => {
        const updatedTask = {
            title: editTaskTitle.value,
            description: editTaskDesc.value,
            date: editTaskDate.value
        };
        const response = await fetch(`${apiUrl}/${currentEditTask._id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updatedTask)
        });
        const task = await response.json();
        const taskElement = Array.from(taskList.children).find(li => li.querySelector(`input[id="task-checkbox-${task._id}"]`));
        taskElement.querySelector('.task-info').innerHTML = `<strong>${task.title}</strong><br>${truncateText(task.description, 20)}<br><small>${task.date}</small>`;
        editModal.style.display = 'none';
    });

    // Close the modal if the user clicks outside of it
    window.addEventListener('click', (event) => {
        if (event.target == editModal) {
            editModal.style.display = 'none';
        }
    });

    async function setNotification(taskTitle, taskDate, notifyBtn) {
        const now = new Date();
        const notificationTime = new Date(taskDate);
        notificationTime.setDate(notificationTime.getDate() - 1);

        const timeDifference = notificationTime - now;

        if (timeDifference > 0) {
            const timeoutId = setTimeout(() => {
                if (Notification.permission === 'granted') {
                    new Notification(`Task Reminder: ${taskTitle}`, {
                        body: `Don't forget to complete your task: "${taskTitle}".`
                    });
                }
                notifyBtn.classList.remove('active');
                notifyBtn.querySelector('i').classList.remove('fa-bell-slash');
                notifyBtn.querySelector('i').classList.add('fa-bell');
            }, timeDifference);

            notificationTimeouts[taskTitle] = timeoutId;
        }
    }

    function cancelNotification(taskTitle) {
        const timeoutId = notificationTimeouts[taskTitle];
        if (timeoutId) {
            clearTimeout(timeoutId);
            delete notificationTimeouts[taskTitle];
        }
    }

    fetchTasks();
});
