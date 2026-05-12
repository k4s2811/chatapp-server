import { ENV_VARS } from "../config/envVars.js";
import * as authService from "../services/auth.service.js";

export async function signup(req, res, next) {
  try {
    const { email, name, password } = req.body;
    req.log.info({ event: "SIGNUP_ATTEMPT", email });

    const result = await authService.signupUser(email, name, password, req);

    if (result.error) {
      req.log.warn({ event: "SIGNUP_FAILED", email, reason: result.message });
      return res.status(result.status).json({ success: false, message: result.message });
    }

    req.log.info({ event: "SIGNUP_SUCCESS", userId: result.user.id });

    res.cookie("refreshToken", result.refreshToken, {
      maxAge: 30 * 24 * 60 * 60 * 1000,
      httpOnly: true,
      sameSite: "strict",
      secure: ENV_VARS.NODE_ENV === "production",
    });

    return res.status(201).json({
      success: true,
      data: {
        accessToken: result.accessToken,
        user: {
          id: result.user.id,
          name: result.user.name,
          email: result.user.email,
          role: result.user.role,
          is_verified: result.user.is_verified,
        },
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    req.log.info({ event: "LOGIN_ATTEMPT", email });

    const result = await authService.loginUser(email, password, req);

    if (result.error) {
      req.log.warn({ event: "LOGIN_FAILED", email, reason: result.message });
      return res.status(result.status).json({ success: false, message: result.message });
    }

    req.log.info({ event: "LOGIN_SUCCESS", userId: result.user.id });

    res.cookie("refreshToken", result.refreshToken, {
      maxAge: 30 * 24 * 60 * 60 * 1000,
      httpOnly: true,
      sameSite: "strict",
      secure: ENV_VARS.NODE_ENV === "production",
    });

    return res.status(200).json({
      success: true,
      data: {
        accessToken: result.accessToken,
        user: {
          id: result.user.id,
          name: result.user.name,
          email: result.user.email,
          role: result.user.role,
          is_verified: result.user.is_verified,
        },
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function logout(req, res, next) {
  try {
    const token = req.cookies?.refreshToken || req.body?.refreshToken;
    await authService.logoutUser(token, req);

    req.log.info({ event: "LOGOUT_SUCCESS", userId: req.user?.id });
    res.clearCookie("refreshToken");

    return res.json({ success: true, message: "Logged out successfully" });
  } catch (err) {
    next(err);
  }
}

export async function refresh(req, res, next) {
  try {
    const token = req.cookies?.refreshToken || req.body?.refreshToken;
    const result = await authService.refreshSession(token, req);

    if (result.error) {
      req.log.warn({ event: "TOKEN_REFRESH_FAILED" });
      return res.status(result.status).json(result.payload);
    }

    req.log.info({ event: "TOKEN_REFRESH_SUCCESS" });
    return res.json({ success: true, data: { accessToken: result.newAccessToken } });
  } catch (err) {
    next(err);
  }
}

export async function changePassword(req, res, next) {
  try {
    const { currentPassword, newPassword } = req.body;
    const result = await authService.changeUserPassword(req.user.id, currentPassword, newPassword, req);

    if (result.error && result.type === "current_password_invalid") {
      req.log.warn({ event: "PASSWORD_CHANGE_FAILED", userId: req.user.id });
      return res.status(400).json({ success: false, message: "Current password is incorrect" });
    }

    req.log.info({ event: "PASSWORD_CHANGED", userId: req.user.id });
    res.clearCookie("refreshToken");

    return res.json({ success: true, message: "Password changed successfully. Please login again." });
  } catch (err) {
    next(err);
  }
}

export async function me(req, res, next) {
  try {
    const user = await authService.getUserData(req.user.id);
    return res.json({ success: true, data: { user } });
  } catch (err) {
    next(err);
  }
}

export async function getUsersByIds(req, res, next) {
  try {
    const { ids } = req.query;

    if (!ids) {
      req.log.warn({ event: "GET_USERS_BY_IDS_FAILED", userId: req.user.id, message: "No ids provided" })
      return res.status(400).json({ success: false, message: "No ids provided" });
    }

    const result = await authService.getUsersByIdsList(ids);

    if (result.error) {
      req.log.warn({ event: "GET_USERS_BY_IDS_FAILED", userId: req.user.id })
      return res.status(400).json({ success: false, message: "Invalid ids provided" });
    }
    req.log.info({ event: "GET_USERS_BY_IDS_SUCCESS", userId: req.user.id })
    return res.json({ success: true, data: result.data });
  } catch (err) {
    next(err);
  }
}

export async function getAllUsers(req, res, next) {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const search = req.query.search || '';

    const { users, pagination } = await authService.getAllUsersData(page, limit, search);

    return res.json({ success: true, data: users, pagination });
  } catch (err) {
    next(err);
  }
}

export async function updateProfile(req, res, next) {
  try {
    const updatedUser = await authService.updateUserData(req.user.id, req.body);
    req.log.info({ event: "PROFILE_UPDATED", userId: req.user.id });
    return res.json({ success: true, data: updatedUser });
  } catch (err) {
    next(err);
  }
}

export async function googleCallback(req, res, next) {
  try {
    // Passport attaches the Google profile to req.user during the authentication phase
    const profile = req.user;

    if (!profile) {
      req.log.warn({ event: "GOOGLE_CALLBACK_NO_PROFILE" });
      return res.redirect("http://localhost:5100/signin?error=oauth_failed");
    }

    // Pass the profile to the DB service
    const result = await authService.googleAuthUser(profile, req);

    // Set the refresh token securely in the cookie
    res.cookie("refreshToken", result.refreshToken, {
      maxAge: 30 * 24 * 60 * 60 * 1000,
      httpOnly: true,
      sameSite: "strict",
      secure: ENV_VARS.NODE_ENV === "production",
    });

    // The Magic Redirect: Send the user to the frontend chat route with the JWT in the URL
    return res.redirect(`http://localhost:5100/chat?token=${result.accessToken}`);
  } catch (err) {
    req.log.error({ err, event: "GOOGLE_CALLBACK_ERROR" });
    return res.redirect("http://localhost:5100/signin?error=server_error");
  }
}