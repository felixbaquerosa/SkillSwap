<?php

declare(strict_types=1);

use App\Controllers\ApiController;
use App\Core\Router;

/** @var Router $router */

// Health check
$router->get('/api/health', [ApiController::class, 'health']);

// Auth
$router->post('/api/auth/register', [ApiController::class, 'register']);
$router->post('/api/auth/login', [ApiController::class, 'login']);
$router->get('/api/auth/me', [ApiController::class, 'me']);
$router->post('/api/auth/logout', [ApiController::class, 'logout']);
$router->post('/api/profile', [ApiController::class, 'updateProfile']);
$router->post('/api/profile/avatar', [ApiController::class, 'uploadAvatar']);

// Skills
$router->get('/api/skills', [ApiController::class, 'skills']);
$router->get('/api/my-skills', [ApiController::class, 'mySkills']);
$router->post('/api/my-skills', [ApiController::class, 'addSkill']);
$router->post('/api/my-skills/{id}/update', [ApiController::class, 'updateSkill']);
$router->post('/api/my-skills/{id}/disable', [ApiController::class, 'disableSkill']);
$router->post('/api/my-skills/{id}/enable', [ApiController::class, 'enableSkill']);
$router->delete('/api/my-skills/{id}', [ApiController::class, 'deleteSkill']);

// Dashboard
$router->get('/api/dashboard', [ApiController::class, 'dashboard']);

// Discover & matches
$router->get('/api/discover', [ApiController::class, 'discover']);
$router->get('/api/matches', [ApiController::class, 'matches']);
$router->post('/api/matches', [ApiController::class, 'createMatch']);
$router->post('/api/matches/{id}/respond', [ApiController::class, 'respondMatch']);
$router->post('/api/matches/{id}/archive', [ApiController::class, 'archiveMatch']);
$router->post('/api/matches/{id}/unarchive', [ApiController::class, 'unarchiveMatch']);
$router->post('/api/matches/{id}/delete', [ApiController::class, 'deleteMatch']);
$router->get('/api/matches/{id}/rating', [ApiController::class, 'matchRating']);
$router->post('/api/matches/{id}/rating', [ApiController::class, 'submitRating']);

// Messages
$router->get('/api/matches/{id}/messages', [ApiController::class, 'messages']);
$router->post('/api/matches/{id}/messages', [ApiController::class, 'sendMessage']);

// Sessions
$router->get('/api/sessions', [ApiController::class, 'sessions']);
$router->get('/api/sessions/reminders', [ApiController::class, 'sessionReminders']);
$router->post('/api/sessions', [ApiController::class, 'createSession']);

// AI
$router->post('/api/ai/match-suggestions', [ApiController::class, 'aiMatchSuggestions']);
$router->post('/api/ai/assistant', [ApiController::class, 'aiAssistant']);
