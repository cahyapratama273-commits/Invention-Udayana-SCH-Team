const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
        if (entry.isIntersecting) {
            entry.target.classList.remove('opacity-0', '-translate-x-10');
            entry.target.classList.add('opacity-100', 'translate-x-0');
        }
    });
}, {threshold: 0.1});
document.querySelectorAll('.fade-left').forEach(el => observer.observe(el));