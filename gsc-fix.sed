# Fix: move verification meta tag from inside <script> to outside
# Pattern: tag on its own line between gtag config and closing </script>
# Replace: closing </script> before tag → closing </script> AFTER tag
/'G-1Z1LJ0G7ZC');/,/<\/script>/{
  /google-site-verification/{
    h
    d
  }
  /<\/script>/{
    G
    s|</script>|</script>\
  <meta name="google-site-verification" content="ww8q1f3PgVxTvcn7_61lfh-rvIHTomoPc6huyHYB2CY" />|
    s|\n  <meta name="google-site-verification" content="ww8q1f3PgVxTvcn7_61lfh-rvIHTomoPc6huyHYB2CY" />\n  </script>|</script>\n  <meta name="google-site-verification" content="ww8q1f3PgVxTvcn7_61lfh-rvIHTomoPc6huyHYB2CY" />|
  }
}
